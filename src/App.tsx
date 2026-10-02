import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Trash2, Download, Copy, ShoppingCart, User, Package, CheckCircle2, 
  XCircle, RefreshCw, Image as ImageIcon, Palette, Settings2, X, Sparkles, 
  FileText, Upload, Loader2, Wand2, CreditCard, DollarSign, Check, AlertCircle, 
  Edit3, MessageSquare, Send, Filter, Building2, ImagePlus, Camera, Mic, MicOff,
  Smartphone, Monitor, Volume2, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CameraCaptureModal } from '@/components/CameraCaptureModal';
import { OrderEntry, ItemSummary, AppSettings } from './types';

const STORAGE_KEY = 'group-buy-helper-data';
const SETTINGS_KEY = 'group-buy-helper-settings';
const VIEW_MODE_KEY = 'group-buy-helper-viewmode';

const PRESET_COLORS = [
  '#f7fee7', '#f8f9fa', '#ffffff', '#fff5f5', '#fff9db', '#f3f0ff', '#e7f5ff', '#ebfbee', '#fff4e6'
];

const PRESET_ACCENTS = [
  '#84cc16', '#f97316', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'
];

export default function App() {
  const [entries, setEntries] = useState<OrderEntry[]>([]);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [mobileTab, setMobileTab] = useState<'add' | 'list' | 'items' | 'payment'>('add');

  const [settings, setSettings] = useState<AppSettings>({
    backgroundColor: '#f7fee7',
    accentColor: '#84cc16',
    menuImageUrl: '',
    accentImageUrl: '',
    paymentAccountInfo: ''
  });

  const [formData, setFormData] = useState({
    buyer: '',
    item: '',
    price: '',
    quantity: '1',
    imageUrl: '',
    isWeighedOnSite: false
  });

  // Price Editing States
  const [editingPriceEntry, setEditingPriceEntry] = useState<OrderEntry | null>(null);
  const [priceInputVal, setPriceInputVal] = useState('');

  // Input File Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuFileInputRef = useRef<HTMLInputElement>(null);
  const accentFileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const aiImageFileInputRef = useRef<HTMLInputElement>(null);
  const cameraDirectInputRef = useRef<HTMLInputElement>(null);
  const formCameraDirectInputRef = useRef<HTMLInputElement>(null);

  // Camera Modal States
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'ai' | 'item' | 'menu'>('ai');

  // AI Analysis States
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiRawText, setAiRawText] = useState('');
  const [aiFileName, setAiFileName] = useState('');
  const [aiImages, setAiImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedAiItems, setParsedAiItems] = useState<{ buyer: string; item: string; price: number; quantity: number }[] | null>(null);

  // Speech Recognition (Microphone Voice Input) States
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Payment Record Editing States
  const [buyerFilter, setBuyerFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [editingPaymentBuyer, setEditingPaymentBuyer] = useState<string | null>(null);
  const [paymentEditForm, setPaymentEditForm] = useState({
    paymentMethod: '銀行轉帳',
    paymentNote: ''
  });

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-TW';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          const cleanText = finalTranscript.trim();
          setAiRawText(prev => {
            const current = prev.trim();
            return current ? `${current}\n${cleanText}` : cleanText;
          });
          toast.success(`已辨識語音：「${cleanText}」`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('未取得麥克風權限，請在瀏覽器設定中允許麥克風存取');
        } else if (event.error !== 'no-speech') {
          toast.error(`語音辨識提示: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition init failed:', err);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    if (!speechSupported || !recognitionRef.current) {
      toast.info('您的瀏覽器未啟用 Web Speech API，您可直接點擊手機鍵盤上的語音麥克風進行語音輸入！');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      toast.info('已停止麥克風語音輸入');
    } else {
      try {
        recognitionRef.current.start();
        toast.info('🎙️ 正在聆聽語音中... 請說出訂購內容 (如: 小明 珍珠奶茶微糖 2杯 100元)');
      } catch (e) {
        console.warn('Recognition start error:', e);
        try {
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current.start(), 200);
        } catch {}
      }
    }
  };

  const handleTextFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAiFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setAiRawText(content || '');
        toast.success(`已讀取文字檔：${file.name}`);
      };
      reader.onerror = () => {
        toast.error('檔案讀取失敗，請確認檔案格式');
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleAiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files) as File[];
      toast.info(`正在優化載入 ${fileList.length} 張圖片...`);
      const compressedImages: string[] = [];
      for (const file of fileList) {
        try {
          const dataUrl = await compressImage(file);
          if (dataUrl) {
            compressedImages.push(dataUrl);
          }
        } catch {
          console.warn(`壓縮圖片 ${file.name} 失敗`);
        }
      }
      if (compressedImages.length > 0) {
        setAiImages(prev => [...prev, ...compressedImages]);
        toast.success(`已加入 ${compressedImages.length} 張截圖/圖片！`);
      }
    }
  };

  // Direct Camera Capture handler for AI modal
  const handleDirectCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info('正在處理拍攝的照片...');
      const dataUrl = await compressImage(file);
      if (dataUrl) {
        setAiImages(prev => [...prev, dataUrl]);
        setIsAiDialogOpen(true);
        toast.success('已成功將拍攝的照片加入 AI 辨識！');
      }
    }
  };

  // Form direct camera capture
  const handleFormDirectCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await compressImage(file);
      if (dataUrl) {
        setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
        toast.success('已設定拍攝的品項照片！');
      }
    }
  };

  const handleCameraModalCapture = (imageDataUrl: string) => {
    if (cameraTarget === 'ai') {
      setAiImages(prev => [...prev, imageDataUrl]);
      setIsAiDialogOpen(true);
      toast.success('已成功將拍攝的照片加入 AI 分析清單！');
    } else if (cameraTarget === 'item') {
      setFormData(prev => ({ ...prev, imageUrl: imageDataUrl }));
      toast.success('已成功設定品項照片！');
    } else if (cameraTarget === 'menu') {
      setSettings(prev => ({ ...prev, menuImageUrl: imageDataUrl }));
      toast.success('已成功設定菜單照片！');
    }
  };

  const openCameraFor = (target: 'ai' | 'item' | 'menu') => {
    setCameraTarget(target);
    setIsCameraModalOpen(true);
  };

  const removeAiImage = (index: number) => {
    setAiImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRunAiAnalysis = async () => {
    if (!aiRawText.trim() && aiImages.length === 0) {
      toast.error('請先輸入文字對話、語音、上傳文字檔或上傳截圖照片');
      return;
    }
    setIsAnalyzing(true);
    setParsedAiItems(null);
    try {
      const res = await fetch('/api/parse-group-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiRawText, images: aiImages }),
      });

      let data: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const textResp = await res.text();
        console.warn('Non-JSON response from server:', textResp.slice(0, 300));
        throw new Error(
          res.status === 504 || res.status === 408
            ? '伺服器分析超時，請稍後重試或減少圖片張數'
            : res.status === 413
            ? '上傳的圖片檔案過大，請選擇較小或較少張的圖片'
            : res.status === 503
            ? 'AI 服務目前使用量高，請等待 3~5 秒後再試'
            : `伺服器回應異常 (狀態碼 ${res.status})`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || '分析失敗');
      }
      if (!data.items || data.items.length === 0) {
        toast.warning('未找到明確的訂購記錄，請確認輸入內容或圖片');
        setParsedAiItems([]);
      } else {
        setParsedAiItems(data.items);
        toast.success(`AI 成功辨識並分析出 ${data.items.length} 筆訂單！`);
      }
    } catch (err: any) {
      console.error('AI error:', err);
      toast.error(err?.message || 'AI 分析過程發生錯誤');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAiImport = () => {
    if (!parsedAiItems || parsedAiItems.length === 0) return;
    const newEntries: OrderEntry[] = parsedAiItems.map(item => ({
      id: crypto.randomUUID(),
      buyer: item.buyer || '未具名',
      item: item.item || '未命名商品',
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      imageUrl: '',
      createdAt: Date.now(),
      isPaid: false,
      isDelivered: false,
    }));

    setEntries(prev => [...newEntries, ...prev]);
    toast.success(`成功匯入 ${newEntries.length} 筆訂單！`);
    setIsAiDialogOpen(false);
    setAiRawText('');
    setAiFileName('');
    setAiImages([]);
    setParsedAiItems(null);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const updateParsedItem = (index: number, field: string, value: any) => {
    if (!parsedAiItems) return;
    const updated = [...parsedAiItems];
    updated[index] = { ...updated[index], [field]: value };
    setParsedAiItems(updated);
  };

  const removeParsedItem = (index: number) => {
    if (!parsedAiItems) return;
    setParsedAiItems(parsedAiItems.filter((_, i) => i !== index));
  };

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    const savedViewMode = localStorage.getItem(VIEW_MODE_KEY) as 'desktop' | 'mobile';

    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
    if (savedViewMode === 'desktop' || savedViewMode === 'mobile') {
      setViewMode(savedViewMode);
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'item' | 'menu' | 'accent') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error('圖片太大囉！請上傳小於 1MB 的圖片。');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === 'item') {
          setFormData(prev => ({ ...prev, imageUrl: base64String }));
        } else if (type === 'menu') {
          setSettings(prev => ({ ...prev, menuImageUrl: base64String }));
        } else {
          setSettings(prev => ({ ...prev, accentImageUrl: base64String }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openPriceEditModal = (entry: OrderEntry) => {
    setEditingPriceEntry(entry);
    setPriceInputVal(entry.price > 0 ? entry.price.toString() : '');
  };

  const handleSaveEntryPrice = () => {
    if (!editingPriceEntry) return;
    const newPrice = parseFloat(priceInputVal) || 0;
    setEntries(prev => prev.map(e => e.id === editingPriceEntry.id ? { ...e, price: newPrice } : e));
    if (newPrice > 0) {
      toast.success(`已將 [${editingPriceEntry.buyer} - ${editingPriceEntry.item}] 單價設為 $${newPrice}`);
    } else {
      toast.info(`已將 [${editingPriceEntry.buyer} - ${editingPriceEntry.item}] 標記為店家現場秤重`);
    }
    setEditingPriceEntry(null);
    setPriceInputVal('');
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.buyer.trim() || !formData.item.trim() || !formData.quantity) {
      toast.error('請填寫購買人、品項與數量');
      return;
    }

    const priceNum = formData.isWeighedOnSite ? 0 : (parseFloat(formData.price) || 0);

    const newEntry: OrderEntry = {
      id: crypto.randomUUID(),
      buyer: formData.buyer.trim(),
      item: formData.item.trim(),
      price: priceNum,
      quantity: parseInt(formData.quantity) || 1,
      imageUrl: formData.imageUrl,
      createdAt: Date.now(),
      isPaid: false,
      isDelivered: false
    };

    setEntries([newEntry, ...entries]);
    setFormData({ buyer: '', item: '', price: '', quantity: '1', imageUrl: '', isWeighedOnSite: false });
    if (priceNum === 0) {
      toast.success('已新增訂單（標記為店家現場秤重）');
    } else {
      toast.success('已新增訂單');
    }
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
    toast.info('已刪除訂單');
  };

  const toggleStatus = (id: string, field: 'isPaid' | 'isDelivered') => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: !e[field] } : e));
  };

  const clearAll = () => {
    if (confirm('確定要清空所有資料嗎？')) {
      setEntries([]);
      toast.info('已清空所有資料');
    }
  };

  // Summaries
  const itemSummaries = useMemo(() => {
    const map = new Map<string, ItemSummary & { hasUnpriced: boolean; unpricedCount: number; fixedCount: number }>();
    entries.forEach(e => {
      const existing = map.get(e.item) || {
        itemName: e.item,
        totalQuantity: 0,
        totalAmount: 0,
        hasUnpriced: false,
        unpricedCount: 0,
        fixedCount: 0,
        buyers: []
      };
      existing.totalQuantity += e.quantity;
      if (e.price === 0) {
        existing.hasUnpriced = true;
        existing.unpricedCount += e.quantity;
      } else {
        existing.fixedCount += e.quantity;
        existing.totalAmount += e.price * e.quantity;
      }
      existing.buyers.push({
        buyerName: e.buyer,
        quantity: e.quantity,
        amount: e.price * e.quantity
      });
      map.set(e.item, existing);
    });
    return Array.from(map.values());
  }, [entries]);

  const buyerSummaries = useMemo(() => {
    const map = new Map<string, {
      buyerName: string;
      totalAmount: number;
      paidAmount: number;
      unpricedItemsCount: number;
      isFullyPaid: boolean;
      isPartiallyPaid: boolean;
      paymentMethod?: string;
      paymentNote?: string;
      items: (OrderEntry & { amount: number })[];
    }>();

    entries.forEach(e => {
      const existing = map.get(e.buyer) || {
        buyerName: e.buyer,
        totalAmount: 0,
        paidAmount: 0,
        unpricedItemsCount: 0,
        isFullyPaid: false,
        isPartiallyPaid: false,
        paymentMethod: e.paymentMethod || '',
        paymentNote: e.paymentNote || '',
        items: []
      };

      const itemAmount = e.price * e.quantity;
      existing.totalAmount += itemAmount;
      if (e.price === 0) {
        existing.unpricedItemsCount += 1;
      }
      if (e.isPaid) {
        existing.paidAmount += itemAmount;
      }
      if (e.paymentMethod) existing.paymentMethod = e.paymentMethod;
      if (e.paymentNote) existing.paymentNote = e.paymentNote;

      existing.items.push({
        ...e,
        amount: itemAmount
      });

      map.set(e.buyer, existing);
    });

    map.forEach((summary) => {
      summary.isFullyPaid = summary.items.length > 0 && summary.items.every(i => i.isPaid);
      summary.isPartiallyPaid = !summary.isFullyPaid && summary.items.some(i => i.isPaid);
    });

    return Array.from(map.values());
  }, [entries]);

  // Overall statistics for Payment Collection
  const totalGroupBuyAmount = useMemo(() => entries.reduce((acc, e) => acc + e.price * e.quantity, 0), [entries]);
  const unpricedEntriesCount = useMemo(() => entries.filter(e => e.price === 0).length, [entries]);
  const totalCollectedAmount = useMemo(() => entries.reduce((acc, e) => e.isPaid ? acc + e.price * e.quantity : acc, 0), [entries]);
  const totalPendingAmount = totalGroupBuyAmount - totalCollectedAmount;
  const collectionProgress = totalGroupBuyAmount > 0 ? Math.round((totalCollectedAmount / totalGroupBuyAmount) * 100) : 0;

  const filteredBuyerSummaries = useMemo(() => {
    if (buyerFilter === 'paid') return buyerSummaries.filter(b => b.isFullyPaid);
    if (buyerFilter === 'unpaid') return buyerSummaries.filter(b => !b.isFullyPaid);
    return buyerSummaries;
  }, [buyerSummaries, buyerFilter]);

  // Toggle all items for a specific buyer as paid / unpaid
  const toggleBuyerAllPaid = (buyerName: string, markPaid: boolean) => {
    setEntries(prev => prev.map(e => e.buyer === buyerName ? { ...e, isPaid: markPaid, paidAt: markPaid ? Date.now() : undefined } : e));
    toast.success(`已將 ${buyerName} 的所有品項標記為 ${markPaid ? '已付款' : '未付款'}`);
  };

  // Copy individual payment reminder for buyer
  const copyBuyerReminderText = (buyerName: string) => {
    const buyerData = buyerSummaries.find(b => b.buyerName === buyerName);
    if (!buyerData) return;

    let text = `📢【團購個人對帳催繳通知 - ${buyerName}】\n\n`;
    text += `📋 訂購明細：\n`;
    buyerData.items.forEach(i => {
      if (i.price > 0) {
        text += `  • ${i.item} x${i.quantity} = $${i.amount} (${i.isPaid ? '已標記付款' : '待繳費'})\n`;
      } else {
        text += `  • ${i.item} x${i.quantity} (店家現場秤重標價) (${i.isPaid ? '已標記付款' : '待秤重後核算'})\n`;
      }
    });
    text += `------------------\n`;
    if (buyerData.unpricedItemsCount > 0) {
      text += `💰 已定價金額：$${buyerData.totalAmount.toLocaleString()} (含 ${buyerData.unpricedItemsCount} 項待店家現場秤重)\n`;
    } else {
      text += `💰 應付總額：$${buyerData.totalAmount.toLocaleString()}\n`;
    }
    text += `💵 已收金額：$${buyerData.paidAmount.toLocaleString()}\n`;
    const remaining = buyerData.totalAmount - buyerData.paidAmount;
    if (remaining > 0) {
      text += `⚠️ 待補餘額：$${remaining.toLocaleString()}\n`;
    } else if (buyerData.unpricedItemsCount === 0) {
      text += `✨ 繳費狀態：已全額結清\n`;
    }

    if (buyerData.paymentMethod || buyerData.paymentNote) {
      text += `📝 繳費紀錄備註：${[buyerData.paymentMethod, buyerData.paymentNote].filter(Boolean).join(' - ')}\n`;
    }

    if (settings.paymentAccountInfo) {
      text += `\n🏦 匯款帳號/收款方式：\n${settings.paymentAccountInfo}\n`;
    }
    text += `\n（轉帳後請告知帳號末五碼方便對帳，謝謝！）`;

    navigator.clipboard.writeText(text);
    toast.success(`已複製 ${buyerName} 的個人對帳催繳通知！`);
  };

  const openPaymentEditDialog = (buyerName: string, currentMethod?: string, currentNote?: string) => {
    setEditingPaymentBuyer(buyerName);
    setPaymentEditForm({
      paymentMethod: currentMethod || '銀行轉帳',
      paymentNote: currentNote || ''
    });
  };

  const handleSavePaymentDetails = () => {
    if (!editingPaymentBuyer) return;
    setEntries(prev => prev.map(e => {
      if (e.buyer === editingPaymentBuyer) {
        return {
          ...e,
          paymentMethod: paymentEditForm.paymentMethod,
          paymentNote: paymentEditForm.paymentNote
        };
      }
      return e;
    }));
    toast.success(`已更新 ${editingPaymentBuyer} 的對帳細節！`);
    setEditingPaymentBuyer(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已複製到剪貼簿');
  };

  const generateOrderText = () => {
    let text = "📦 【團購下單統計】\n\n";
    itemSummaries.forEach(s => {
      text += `🔹 ${s.itemName}: 共 ${s.totalQuantity} 件`;
      if (s.unpricedCount > 0) {
        text += ` (店家現場秤重標價)`;
      }
      text += `\n`;
    });
    text += `\n💰 已定價總額: $${totalGroupBuyAmount.toLocaleString()}`;
    if (unpricedEntriesCount > 0) {
      text += ` (另有 ${unpricedEntriesCount} 筆待店家現場秤重品項)`;
    }
    return text;
  };

  const generateDeliveryText = () => {
    let text = "🚚 【到貨發送清單】\n\n";
    buyerSummaries.forEach(s => {
      let totalDesc = `$${s.totalAmount.toLocaleString()}`;
      if (s.unpricedItemsCount > 0) {
        totalDesc = s.totalAmount > 0 ? `$${s.totalAmount.toLocaleString()} + 待現場秤重` : '待現場秤重標價';
      }
      text += `👤 ${s.buyerName} (總計: ${totalDesc})\n`;
      s.items.forEach(i => {
        if (i.price > 0) {
          text += `  - ${i.item} x${i.quantity}\n`;
        } else {
          text += `  - ${i.item} x${i.quantity} (現場秤重標價)\n`;
        }
      });
      text += `\n`;
    });
    return text;
  };

  return (
    <div 
      className="min-h-screen text-[#1a1a1a] font-sans pb-24 md:pb-12 transition-colors duration-500"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      <Toaster position="top-center" richColors />

      {/* Hidden Native Camera Inputs for direct mobile camera launch */}
      <input
        type="file"
        ref={cameraDirectInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleDirectCameraCapture}
      />
      <input
        type="file"
        ref={formCameraDirectInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFormDirectCameraCapture}
      />

      <div className={`mx-auto p-3 sm:p-6 transition-all duration-300 ${viewMode === 'mobile' ? 'max-w-md' : 'max-w-6xl'}`}>
        {/* Top Header & View Mode Switcher */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white/70 backdrop-blur-md p-4 rounded-2xl shadow-xs border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-orange-500 to-amber-400 text-white rounded-xl shadow-xs">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-1.5">
                  團購神器
                  <span className="text-[10px] font-semibold uppercase bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                    {viewMode === 'mobile' ? '📱 手機版' : '💻 電腦版'}
                  </span>
                </h1>
                <p className="text-xs text-gray-500">拍照、語音、AI 自動辨識團購訂單</p>
              </div>
            </div>
          </div>

          {/* Action Bar: View Switcher & AI & Settings */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* View Mode Toggle Button */}
            <div className="bg-gray-100 p-0.5 rounded-lg flex items-center border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setViewMode('desktop');
                  toast.success('已切換為電腦版版面');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'desktop'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">電腦版</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('mobile');
                  toast.success('已切換為手機版版面');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'mobile'
                    ? 'bg-white text-orange-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>手機版</span>
              </button>
            </div>

            {/* Direct Camera Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                  cameraDirectInputRef.current?.click();
                } else {
                  openCameraFor('ai');
                }
              }}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 text-xs h-8 px-2.5"
              title="使用相機直接拍照辨識團購"
            >
              <Camera className="w-3.5 h-3.5 mr-1 text-amber-600" />
              拍照辨識
            </Button>

            {/* AI Import Button */}
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAiDialogOpen(true)}
              className="text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-xs border-0 font-medium text-xs h-8 px-2.5"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-yellow-300 animate-pulse" />
              AI 智能辨識
            </Button>

            {/* Settings Popover */}
            <Popover>
              <PopoverTrigger render={(props) => (
                <Button variant="outline" size="sm" {...props} className="h-8 px-2">
                  <Settings2 className="w-3.5 h-3.5" />
                </Button>
              )} />
              <PopoverContent className="w-80 p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-500">背景顏色</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color, idx) => (
                      <button
                        key={`preset-color-${color}-${idx}`}
                        onClick={() => setSettings(prev => ({ ...prev, backgroundColor: color }))}
                        className={`w-7 h-7 rounded-full border border-gray-200 transition-transform hover:scale-110 ${settings.backgroundColor === color ? 'ring-2 ring-orange-500 ring-offset-2' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-500">主題重點顏色</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ACCENTS.map((color, idx) => (
                      <button
                        key={`preset-accent-${color}-${idx}`}
                        onClick={() => setSettings(prev => ({ ...prev, accentColor: color }))}
                        className={`w-7 h-7 rounded-full border border-gray-200 transition-transform hover:scale-110 ${settings.accentColor === color ? 'ring-2 ring-gray-400 ring-offset-2' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-500">菜單/參考圖 (支援相機拍照與相簿)</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs"
                      onClick={() => openCameraFor('menu')}
                    >
                      <Camera className="w-3.5 h-3.5 mr-1" />
                      拍照
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs"
                      onClick={() => menuFileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-1" />
                      相簿
                    </Button>
                  </div>
                  <input 
                    type="file" 
                    ref={menuFileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'menu')}
                  />
                  {settings.menuImageUrl && (
                    <div className="relative mt-2">
                      <img src={settings.menuImageUrl} alt="Menu" className="w-full h-24 object-cover rounded-md border border-gray-200" />
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                        onClick={() => setSettings(prev => ({ ...prev, menuImageUrl: '' }))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <Label className="text-xs uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    預設收款帳號 / 匯款說明
                  </Label>
                  <textarea
                    rows={2}
                    value={settings.paymentAccountInfo || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, paymentAccountInfo: e.target.value }))}
                    placeholder="例：玉山銀行 (808) 12345-67890 / LINE Pay ID: mypay"
                    className="w-full text-xs p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 bg-gray-50/50"
                  />
                  <p className="text-[11px] text-gray-400">一鍵複製個人催繳對帳單時，會自動附上此說明。</p>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <Button variant="ghost" size="sm" onClick={clearAll} className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 text-xs">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    清空所有訂購資料
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Live Audio Listening Feedback Banner */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl shadow-md flex items-center justify-between gap-2 animate-pulse"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-3 h-3 rounded-full bg-white animate-ping shrink-0" />
              <div className="text-xs">
                <p className="font-bold flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5" /> 正在錄音聆聽中...
                </p>
                <p className="opacity-90 text-[11px] truncate">請對麥克風說出訂購人、品項與數量</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={toggleSpeechRecognition}
              className="bg-white text-rose-600 hover:bg-rose-50 text-xs h-7 shrink-0 font-bold"
            >
              完成錄音
            </Button>
          </motion.div>
        )}

        {/* Menu Image Preview Card */}
        {settings.menuImageUrl && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-6"
          >
            <Card className="border-none shadow-xs overflow-hidden bg-white/80">
              <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-orange-500" />
                  團購菜單 / 參考圖
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, menuImageUrl: '' }))}
                  className="h-6 text-[11px] text-gray-400 hover:text-red-500"
                >
                  隱藏菜單
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <img src={settings.menuImageUrl} alt="Group Buy Menu" className="w-full max-h-[320px] object-contain bg-gray-50" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* MOBILE VIEW LAYOUT (📱 手機專用版面) */}
        {/* ========================================================================= */}
        {viewMode === 'mobile' ? (
          <div className="space-y-4">
            {/* Quick Summary Floating Banner */}
            <div 
              className="rounded-2xl p-4 text-white shadow-md relative overflow-hidden"
              style={{ backgroundColor: settings.accentColor }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-white/80 font-medium">團購總計金額</span>
                  <div className="text-2xl font-black mt-0.5">
                    ${totalGroupBuyAmount.toLocaleString()}
                  </div>
                  {unpricedEntriesCount > 0 && (
                    <p className="text-[11px] text-white/90 font-medium">
                      含 {unpricedEntriesCount} 筆待現場秤重
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-white/80">對帳進度</span>
                  <div className="text-lg font-bold text-emerald-100">{collectionProgress}%</div>
                  <span className="text-[11px] text-white/70">共 {entries.length} 筆明細</span>
                </div>
              </div>

              {/* Mobile Quick Action Buttons Bar */}
              <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                      cameraDirectInputRef.current?.click();
                    } else {
                      openCameraFor('ai');
                    }
                  }}
                  className="flex items-center justify-center gap-1 bg-white/20 hover:bg-white/30 text-white rounded-xl py-2 px-1 text-xs font-semibold backdrop-blur-xs transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4 text-yellow-300" />
                  拍照辨識
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAiDialogOpen(true);
                    if (!isListening) toggleSpeechRecognition();
                  }}
                  className="flex items-center justify-center gap-1 bg-white/20 hover:bg-white/30 text-white rounded-xl py-2 px-1 text-xs font-semibold backdrop-blur-xs transition-all active:scale-95"
                >
                  <Mic className="w-4 h-4 text-emerald-300" />
                  語音輸入
                </button>
                <button
                  type="button"
                  onClick={() => setIsAiDialogOpen(true)}
                  className="flex items-center justify-center gap-1 bg-white/20 hover:bg-white/30 text-white rounded-xl py-2 px-1 text-xs font-semibold backdrop-blur-xs transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
                  AI 匯入
                </button>
              </div>
            </div>

            {/* Mobile Tab Content Section */}
            {mobileTab === 'add' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <Card className="border-none shadow-sm bg-white rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>➕ 新增訂單</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAiDialogOpen(true)}
                        className="text-purple-600 hover:text-purple-700 text-xs h-7"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        AI 語音/拍照匯入
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddEntry} className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="m-buyer" className="text-xs font-semibold text-gray-700">購買人姓名</Label>
                        <Input 
                          id="m-buyer" 
                          placeholder="例如：小明、阿美" 
                          value={formData.buyer}
                          onChange={e => setFormData({ ...formData, buyer: e.target.value })}
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="m-item" className="text-xs font-semibold text-gray-700">品項名稱</Label>
                        <Input 
                          id="m-item" 
                          placeholder="例如：日本草莓、炸雞排" 
                          value={formData.item}
                          onChange={e => setFormData({ ...formData, item: e.target.value })}
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="m-price" className="text-xs font-semibold text-gray-700">單價 (元)</Label>
                            <label className="text-[10px] text-amber-700 flex items-center gap-0.5 cursor-pointer font-medium">
                              <input 
                                type="checkbox" 
                                checked={formData.isWeighedOnSite} 
                                onChange={e => setFormData({ ...formData, isWeighedOnSite: e.target.checked, price: e.target.checked ? '0' : formData.price })}
                                className="rounded border-amber-300 text-amber-600 h-3 w-3"
                              />
                              現場秤重
                            </label>
                          </div>
                          <Input 
                            id="m-price" 
                            type="number" 
                            placeholder={formData.isWeighedOnSite ? "現場秤重" : "0"} 
                            disabled={formData.isWeighedOnSite}
                            value={formData.isWeighedOnSite ? '' : formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                            className={`h-10 text-sm ${formData.isWeighedOnSite ? "bg-amber-50/80 border-amber-200 text-amber-800 font-medium" : ""}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="m-quantity" className="text-xs font-semibold text-gray-700">數量</Label>
                          <Input 
                            id="m-quantity" 
                            type="number" 
                            placeholder="1" 
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>

                      {/* Photo Attachment */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-gray-600">商品照片 (選填)</Label>
                          {formData.imageUrl && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                              className="text-xs text-red-500 hover:underline"
                            >
                              移除照片
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-9 text-xs"
                            onClick={() => {
                              if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                                formCameraDirectInputRef.current?.click();
                              } else {
                                openCameraFor('item');
                              }
                            }}
                          >
                            <Camera className="w-3.5 h-3.5 mr-1 text-orange-500" />
                            拍照
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-9 text-xs"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <ImageIcon className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                            相簿
                          </Button>
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'item')}
                        />
                        {formData.imageUrl && (
                          <div className="relative mt-2">
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-28 object-cover rounded-xl border border-gray-200" />
                          </div>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full text-white font-bold h-11 rounded-xl shadow-md transition-all active:scale-98 mt-2"
                        style={{ backgroundColor: settings.accentColor }}
                      >
                        <Plus className="w-5 h-5 mr-1.5" />
                        加入清單
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {mobileTab === 'list' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-gray-900">訂單明細 ({entries.length} 筆)</h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generateDeliveryText())} className="h-7 text-xs text-indigo-600">
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    複製發貨名單
                  </Button>
                </div>

                {entries.length === 0 ? (
                  <Card className="p-8 text-center bg-white rounded-2xl border-none text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">尚無訂單資料，請點擊下方「➕ 新增」或使用「AI 辨識」</p>
                  </Card>
                ) : (
                  <div className="space-y-2.5">
                    {entries.map((entry) => (
                      <Card key={entry.id} className="bg-white rounded-2xl border-none shadow-xs p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {entry.imageUrl ? (
                              <img src={entry.imageUrl} alt={entry.item} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                                {entry.buyer.slice(0, 1)}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-gray-900">{entry.buyer}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  x{entry.quantity}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 font-medium">{entry.item}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            {entry.price > 0 ? (
                              <div>
                                <p className="font-black text-sm text-gray-900">${(entry.price * entry.quantity).toLocaleString()}</p>
                                <p className="text-[10px] text-gray-400">${entry.price}/件</p>
                              </div>
                            ) : (
                              <div>
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0">
                                  現場秤重
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => openPriceEditModal(entry)}
                                  className="block text-[10px] text-amber-700 underline font-medium mt-0.5"
                                >
                                  填單價
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status toggles & Delete */}
                        <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleStatus(entry.id, 'isPaid')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                                entry.isPaid 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {entry.isPaid ? '已付款' : '未付款'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleStatus(entry.id, 'isDelivered')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                                entry.isDelivered 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              <Package className="w-3.5 h-3.5" />
                              {entry.isDelivered ? '已領取' : '待領取'}
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openPriceEditModal(entry)}
                              className="p-1 text-gray-400 hover:text-gray-700"
                              title="修改單價"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                              title="刪除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {mobileTab === 'items' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-gray-900">品項總覽 ({itemSummaries.length} 種商品)</h3>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateOrderText())} className="h-7 text-xs">
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    複製下單文字
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {itemSummaries.map((summary, idx) => (
                    <Card key={`m-item-${summary.itemName}-${idx}`} className="bg-white rounded-2xl border-none shadow-xs p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{summary.itemName}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {summary.unpricedCount > 0 ? (
                              <span className="text-amber-700 font-medium">含 {summary.unpricedCount} 件待現場秤重</span>
                            ) : (
                              `總金額: $${summary.totalAmount.toLocaleString()}`
                            )}
                          </p>
                        </div>
                        <Badge className="bg-orange-100 text-orange-800 text-xs px-2.5 py-0.5">
                          共 {summary.totalQuantity} 件
                        </Badge>
                      </div>

                      <div className="pt-2 border-t border-gray-50 space-y-1">
                        {summary.buyers.map((b, bIdx) => (
                          <div key={`m-buyer-item-${b.buyerName}-${bIdx}`} className="flex justify-between text-xs py-0.5 text-gray-600">
                            <span>{b.buyerName}</span>
                            <span className="font-semibold text-gray-800">x{b.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {mobileTab === 'payment' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {/* Mobile Filter */}
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl shadow-xs text-xs overflow-x-auto">
                  <button
                    onClick={() => setBuyerFilter('all')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                      buyerFilter === 'all' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    全部 ({buyerSummaries.length})
                  </button>
                  <button
                    onClick={() => setBuyerFilter('unpaid')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                      buyerFilter === 'unpaid' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    未付 ({buyerSummaries.filter(b => !b.isFullyPaid).length})
                  </button>
                  <button
                    onClick={() => setBuyerFilter('paid')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                      buyerFilter === 'paid' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    已清 ({buyerSummaries.filter(b => b.isFullyPaid).length})
                  </button>
                </div>

                <div className="space-y-2.5">
                  {filteredBuyerSummaries.map((summary, idx) => (
                    <Card key={`m-buyer-${summary.buyerName}-${idx}`} className="bg-white rounded-2xl border-none shadow-xs p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-gray-900">{summary.buyerName}</h4>
                            {summary.isFullyPaid ? (
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0">已全付</Badge>
                            ) : summary.isPartiallyPaid ? (
                              <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0">部分付</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 text-[10px] px-1.5 py-0">未付</Badge>
                            )}
                          </div>
                          {(summary.paymentMethod || summary.paymentNote) && (
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {[summary.paymentMethod, summary.paymentNote].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-black text-base text-gray-900">${summary.totalAmount.toLocaleString()}</p>
                          {summary.unpricedItemsCount > 0 && (
                            <p className="text-[10px] text-amber-700 font-medium">+ 秤重待定</p>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50/70 p-2.5 rounded-xl space-y-1">
                        {summary.items.map((item, itemIdx) => (
                          <div key={`m-b-item-${item.id}-${itemIdx}`} className="flex justify-between text-xs items-center">
                            <span className={item.isPaid ? 'line-through text-gray-400' : 'text-gray-700'}>
                              {item.item} x{item.quantity}
                            </span>
                            <span className={`font-semibold ${item.isPaid ? 'text-emerald-600' : 'text-gray-900'}`}>
                              {item.price > 0 ? `$${item.amount}` : '待秤重'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBuyerAllPaid(summary.buyerName, !summary.isFullyPaid)}
                          className={`h-8 text-xs font-semibold px-2.5 rounded-xl ${
                            summary.isFullyPaid ? 'text-rose-600 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
                          }`}
                        >
                          {summary.isFullyPaid ? '設為未付' : '一鍵全付'}
                        </Button>

                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openPaymentEditDialog(summary.buyerName, summary.paymentMethod, summary.paymentNote)}
                            className="h-8 text-xs text-purple-700 bg-purple-50 rounded-xl"
                          >
                            對帳備註
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => copyBuyerReminderText(summary.buyerName)}
                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            催繳單
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Mobile Fixed Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 py-1.5 px-3 shadow-lg">
              <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => setMobileTab('add')}
                  className={`flex flex-col items-center py-1 rounded-xl transition-all ${
                    mobileTab === 'add' ? 'text-orange-600 font-bold bg-orange-50/80' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[11px] mt-0.5">新增</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('list')}
                  className={`flex flex-col items-center py-1 rounded-xl transition-all relative ${
                    mobileTab === 'list' ? 'text-orange-600 font-bold bg-orange-50/80' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Package className="w-5 h-5" />
                  <span className="text-[11px] mt-0.5">明細 ({entries.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('items')}
                  className={`flex flex-col items-center py-1 rounded-xl transition-all ${
                    mobileTab === 'items' ? 'text-orange-600 font-bold bg-orange-50/80' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-[11px] mt-0.5">品項 ({itemSummaries.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('payment')}
                  className={`flex flex-col items-center py-1 rounded-xl transition-all ${
                    mobileTab === 'payment' ? 'text-orange-600 font-bold bg-orange-50/80' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-[11px] mt-0.5">對帳催繳</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* DESKTOP VIEW LAYOUT (💻 完整電腦版面) */
          /* ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form & Quick Actions */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">新增訂單</CardTitle>
                  <CardDescription>手動輸入或使用 AI 語音 / 拍照智慧匯入</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AI & Camera Quick Action Ribbon */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 shrink-0 animate-pulse" />
                      <span className="font-medium">拍照 / 麥克風語音 / 貼對話</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAiDialogOpen(true)}
                      className="bg-white border-purple-300 hover:bg-purple-100 text-purple-700 font-semibold shrink-0 h-7 text-xs"
                    >
                      開啟 AI 整理
                    </Button>
                  </div>

                  <form onSubmit={handleAddEntry} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="buyer">購買人</Label>
                      <Input 
                        id="buyer" 
                        placeholder="例如：小明" 
                        value={formData.buyer}
                        onChange={e => setFormData({ ...formData, buyer: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item">品項名稱</Label>
                      <Input 
                        id="item" 
                        placeholder="例如：日本草莓" 
                        value={formData.item}
                        onChange={e => setFormData({ ...formData, item: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="price">單價 (元)</Label>
                          <label className="text-[11px] text-amber-700 flex items-center gap-1 cursor-pointer font-medium hover:text-amber-800">
                            <input 
                              type="checkbox" 
                              checked={formData.isWeighedOnSite} 
                              onChange={e => setFormData({ ...formData, isWeighedOnSite: e.target.checked, price: e.target.checked ? '0' : formData.price })}
                              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                            />
                            店家現場秤重
                          </label>
                        </div>
                        <Input 
                          id="price" 
                          type="number" 
                          placeholder={formData.isWeighedOnSite ? "現場秤重標價" : "0"} 
                          disabled={formData.isWeighedOnSite}
                          value={formData.isWeighedOnSite ? '' : formData.price}
                          onChange={e => setFormData({ ...formData, price: e.target.value })}
                          className={formData.isWeighedOnSite ? "bg-amber-50/80 border-amber-200 text-amber-800 placeholder:text-amber-700/80 font-medium" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity">數量</Label>
                        <Input 
                          id="quantity" 
                          type="number" 
                          placeholder="1" 
                          value={formData.quantity}
                          onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>品項圖片 (選填 - 拍照或上傳)</Label>
                      <div className="flex gap-2 items-center">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                              formCameraDirectInputRef.current?.click();
                            } else {
                              openCameraFor('item');
                            }
                          }}
                        >
                          <Camera className="w-4 h-4 mr-1.5 text-orange-500" />
                          拍照
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImageIcon className="w-4 h-4 mr-1.5 text-indigo-500" />
                          相簿選圖
                        </Button>
                        {formData.imageUrl && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'item')}
                      />
                      {formData.imageUrl && (
                        <div className="mt-2 relative group">
                          <img src={formData.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-md border border-gray-200" />
                        </div>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full text-white font-medium transition-colors"
                      style={{ backgroundColor: settings.accentColor }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      加入清單
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Quick Stats Card */}
              <Card 
                className="border-none shadow-sm text-white relative overflow-hidden"
                style={{ backgroundColor: settings.accentColor }}
              >
                {settings.accentImageUrl && (
                  <div 
                    className="absolute inset-0 opacity-30 bg-cover bg-center mix-blend-overlay"
                    style={{ backgroundImage: `url(${settings.accentImageUrl})` }}
                  />
                )}
                <CardContent className="pt-6 relative z-10">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white/80 text-sm font-medium uppercase tracking-wider">總計金額</p>
                      <h2 className="text-3xl font-bold mt-1">
                        ${totalGroupBuyAmount.toLocaleString()}
                      </h2>
                      {unpricedEntriesCount > 0 && (
                        <p className="text-white/90 text-xs font-medium mt-1">
                          * 另有 {unpricedEntriesCount} 筆待店家現場秤重
                        </p>
                      )}
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/80 text-xs">總品項數</p>
                      <p className="text-lg font-semibold">{itemSummaries.length}</p>
                    </div>
                    <div>
                      <p className="text-white/80 text-xs">總人數</p>
                      <p className="text-lg font-semibold">{buyerSummaries.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: List and Summaries */}
            <div className="lg:col-span-8">
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-white p-1 rounded-lg shadow-sm">
                  <TabsTrigger value="all" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">
                    <Package className="w-4 h-4 mr-2" />
                    所有明細
                  </TabsTrigger>
                  <TabsTrigger value="items" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    品項統計
                  </TabsTrigger>
                  <TabsTrigger value="buyers" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">
                    <User className="w-4 h-4 mr-2" />
                    個人對帳催繳
                  </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  <TabsContent key="tab-content-all" value="all" className="mt-0">
                    <motion.div
                      key="motion-tab-all"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className="border-none shadow-sm bg-white">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <div>
                            <CardTitle>訂單明細</CardTitle>
                            <CardDescription>管理所有購買記錄與付款狀態</CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {entries.length === 0 ? (
                            <div key="empty-entries-msg" className="text-center py-12 text-gray-400">
                              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                              <p>尚無訂單資料，請從左側新增或使用 AI 智能匯入</p>
                            </div>
                          ) : (
                            <Table key="entries-table-view">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>購買人</TableHead>
                                  <TableHead>品項</TableHead>
                                  <TableHead className="text-right">單價</TableHead>
                                  <TableHead className="text-right">數量</TableHead>
                                  <TableHead className="text-right">小計</TableHead>
                                  <TableHead className="text-center">狀態</TableHead>
                                  <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {entries.map((entry, index) => (
                                  <TableRow key={entry.id ? `entry-${entry.id}-${index}` : `entry-idx-${index}`}>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-3">
                                        {entry.imageUrl && (
                                          <img src={entry.imageUrl} alt={entry.item} className="w-10 h-10 rounded-md object-cover border border-gray-100" />
                                        )}
                                        {entry.buyer}
                                      </div>
                                    </TableCell>
                                    <TableCell>{entry.item}</TableCell>
                                    <TableCell className="text-right">
                                      {entry.price > 0 ? (
                                        <div className="flex items-center justify-end gap-1">
                                          <span>${entry.price}</span>
                                          <button
                                            type="button"
                                            onClick={() => openPriceEditModal(entry)}
                                            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                            title="修改單價或設為秤重品項"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-end gap-1">
                                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] font-normal px-1.5 py-0">
                                            現場秤重
                                          </Badge>
                                          <button
                                            type="button"
                                            onClick={() => openPriceEditModal(entry)}
                                            className="p-1 text-amber-700 hover:text-amber-900 transition-colors font-medium text-xs underline"
                                            title="店家秤重完成，補填單價"
                                          >
                                            填單價
                                          </button>
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">{entry.quantity}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {entry.price > 0 ? (
                                        `$${(entry.price * entry.quantity).toLocaleString()}`
                                      ) : (
                                        <span className="text-amber-700 text-xs font-normal">
                                          x{entry.quantity} (待現場秤重)
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex justify-center gap-2">
                                        <button 
                                          onClick={() => toggleStatus(entry.id, 'isPaid')}
                                          className={`transition-colors ${entry.isPaid ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}
                                          title={entry.isPaid ? "已付款" : "未付款"}
                                        >
                                          <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <button 
                                          onClick={() => toggleStatus(entry.id, 'isDelivered')}
                                          className={`transition-colors ${entry.isDelivered ? 'text-blue-500' : 'text-gray-300 hover:text-gray-400'}`}
                                          title={entry.isDelivered ? "已領取" : "未領取"}
                                        >
                                          <Package className="w-5 h-5" />
                                        </button>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="icon" onClick={() => handleDeleteEntry(entry.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </TabsContent>

                  <TabsContent key="tab-content-items" value="items" className="mt-0">
                    <motion.div
                      key="motion-tab-items"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(generateOrderText())}>
                          <Copy className="w-4 h-4 mr-2" />
                          複製下單文字
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {itemSummaries.map((summary, sIdx) => (
                          <Card key={`item-summary-${summary.itemName}-${sIdx}`} className="border-none shadow-sm bg-white overflow-hidden">
                            <div className="h-1 bg-orange-500" />
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{summary.itemName}</CardTitle>
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                  共 {summary.totalQuantity} 件
                                </Badge>
                              </div>
                              <CardDescription>
                                {summary.unpricedCount > 0 && summary.fixedCount === 0 ? (
                                  <span className="text-amber-700 font-medium text-xs flex items-center gap-1 mt-0.5">
                                    店家現場秤重標價 (已登記 {summary.totalQuantity} 件)
                                  </span>
                                ) : summary.unpricedCount > 0 ? (
                                  <span className="text-gray-600 text-xs mt-0.5">
                                    已定價總額: ${summary.totalAmount.toLocaleString()} (另有 {summary.unpricedCount} 件待現場秤重)
                                  </span>
                                ) : (
                                  `總金額: $${summary.totalAmount.toLocaleString()}`
                                )}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {summary.buyers.map((b, idx) => (
                                  <div key={`buyer-item-${b.buyerName}-${idx}`} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                                    <span className="text-gray-600">{b.buyerName}</span>
                                    <span className="font-medium">x{b.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  </TabsContent>

                  <TabsContent key="tab-content-buyers" value="buyers" className="mt-0">
                    <motion.div
                      key="motion-tab-buyers"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      {/* Collection Summary Header Card */}
                      <Card className="border-none shadow-sm bg-gradient-to-r from-slate-900 to-indigo-950 text-white overflow-hidden p-5">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-emerald-400" />
                              個人對帳與繳費催繳進度
                            </h3>
                            <div className="flex items-baseline gap-3">
                              <span className="text-2xl font-bold">${totalCollectedAmount.toLocaleString()}</span>
                              <span className="text-xs text-indigo-200">/ 應收總額 ${totalGroupBuyAmount.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Progress bar and metrics */}
                          <div className="w-full md:w-64 space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-emerald-400">已入帳 {collectionProgress}%</span>
                              <span className="text-amber-300">待追繳 ${totalPendingAmount.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                              <div 
                                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${collectionProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Filter Bar & Quick Actions */}
                        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                            <span className="text-xs text-slate-400 px-2 flex items-center gap-1">
                              <Filter className="w-3 h-3" />
                              篩選：
                            </span>
                            <button
                              onClick={() => setBuyerFilter('all')}
                              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                                buyerFilter === 'all' 
                                  ? 'bg-indigo-600 text-white shadow-xs' 
                                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
                              }`}
                            >
                              全部 ({buyerSummaries.length})
                            </button>
                            <button
                              onClick={() => setBuyerFilter('unpaid')}
                              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                                buyerFilter === 'unpaid' 
                                  ? 'bg-amber-600 text-white shadow-xs' 
                                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
                              }`}
                            >
                              🔴 未結清 ({buyerSummaries.filter(b => !b.isFullyPaid).length})
                            </button>
                            <button
                              onClick={() => setBuyerFilter('paid')}
                              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                                buyerFilter === 'paid' 
                                  ? 'bg-emerald-600 text-white shadow-xs' 
                                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
                              }`}
                            >
                              🟢 已結清 ({buyerSummaries.filter(b => b.isFullyPaid).length})
                            </button>
                          </div>

                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => copyToClipboard(generateDeliveryText())}
                            className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white text-xs"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            複製完整發送清單
                          </Button>
                        </div>
                      </Card>

                      {/* Individual Buyer Cards Grid */}
                      {filteredBuyerSummaries.length === 0 ? (
                        <Card key="empty-buyer-card" className="border-none shadow-sm bg-white py-8 text-center text-gray-400">
                          <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">此篩選條件下無個人訂單資料</p>
                        </Card>
                      ) : (
                        <div key="buyer-cards-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredBuyerSummaries.map((summary, bIdx) => (
                            <Card 
                              key={`buyer-card-${summary.buyerName}-${bIdx}`} 
                              className={`border-none shadow-sm bg-white overflow-hidden transition-all ${
                                summary.isFullyPaid 
                                  ? 'ring-1 ring-emerald-200' 
                                  : summary.isPartiallyPaid 
                                    ? 'ring-1 ring-amber-200' 
                                    : 'hover:shadow-md'
                              }`}
                            >
                              <div className={`h-1.5 ${
                                summary.isFullyPaid 
                                  ? 'bg-emerald-500' 
                                  : summary.isPartiallyPaid 
                                    ? 'bg-amber-500' 
                                    : 'bg-rose-500'
                              }`} />

                              <CardHeader className="pb-3 pt-4 px-4">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <CardTitle className="text-base font-bold text-gray-900">{summary.buyerName}</CardTitle>
                                      {summary.isFullyPaid ? (
                                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[11px] gap-1 px-2 py-0.5">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          已結清
                                        </Badge>
                                      ) : summary.isPartiallyPaid ? (
                                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[11px] gap-1 px-2 py-0.5">
                                          <AlertCircle className="w-3 h-3 text-amber-600" />
                                          部分對帳 (${summary.paidAmount}/${summary.totalAmount})
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] gap-1 px-2 py-0.5">
                                          未繳費
                                        </Badge>
                                      )}
                                    </div>

                                    {(summary.paymentMethod || summary.paymentNote) && (
                                      <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <CreditCard className="w-3 h-3 text-purple-600 shrink-0" />
                                        {[summary.paymentMethod, summary.paymentNote].filter(Boolean).join(' • ')}
                                      </p>
                                    )}
                                  </div>

                                  <div className="text-right">
                                    {summary.unpricedItemsCount > 0 ? (
                                      <div>
                                        <p className="text-base font-bold text-gray-900">
                                          {summary.totalAmount > 0 ? `$${summary.totalAmount.toLocaleString()} + 待秤重` : '待現場秤重'}
                                        </p>
                                        <p className="text-[11px] text-amber-700 font-medium">含 {summary.unpricedItemsCount} 項待秤重品項</p>
                                      </div>
                                    ) : (
                                      <p className="text-lg font-bold text-gray-900">${summary.totalAmount.toLocaleString()}</p>
                                    )}
                                    {summary.paidAmount > 0 && summary.paidAmount < summary.totalAmount && (
                                      <p className="text-[11px] text-emerald-600 font-medium">已收 ${summary.paidAmount}</p>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>

                              <CardContent className="px-4 pb-3">
                                <div className="space-y-2">
                                  {summary.items.map((item, itemIdx) => (
                                    <div 
                                      key={item.id ? `buyer-summary-item-${item.id}-${itemIdx}` : `buyer-summary-item-idx-${itemIdx}`} 
                                      className={`flex justify-between items-center text-xs p-2.5 rounded-lg border transition-colors ${
                                        item.isPaid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50/70 border-gray-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleStatus(item.id, 'isPaid')}
                                          className={`p-0.5 rounded-full transition-colors ${
                                            item.isPaid ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-300 hover:text-gray-400'
                                          }`}
                                          title={item.isPaid ? "點擊標記為未付款" : "點擊標記為已付款"}
                                        >
                                          <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        <div>
                                          <p className={`font-medium ${item.isPaid ? 'text-gray-700 line-through opacity-80' : 'text-gray-900'}`}>
                                            {item.item}
                                          </p>
                                          {item.price > 0 ? (
                                            <p className="text-[11px] text-gray-400">${item.price} x {item.quantity}</p>
                                          ) : (
                                            <p className="text-[11px] text-amber-700 font-medium">x{item.quantity} (現場秤重標價)</p>
                                          )}
                                        </div>
                                      </div>
                                      <span className={`font-bold ${item.isPaid ? 'text-emerald-700' : 'text-gray-800'}`}>
                                        {item.price > 0 ? `$${item.amount.toLocaleString()}` : <span className="text-amber-700 text-xs font-medium">待現場秤重</span>}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>

                              <CardFooter className="bg-gray-50/80 px-4 py-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleBuyerAllPaid(summary.buyerName, !summary.isFullyPaid)}
                                    className={`h-7 px-2 text-xs font-medium ${
                                      summary.isFullyPaid 
                                        ? 'text-rose-600 hover:bg-rose-50' 
                                        : 'text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {summary.isFullyPaid ? (
                                      <>
                                        <XCircle className="w-3.5 h-3.5 mr-1" />
                                        重置未付
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        一鍵全付
                                      </>
                                    )}
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openPaymentEditDialog(summary.buyerName, summary.paymentMethod, summary.paymentNote)}
                                    className="h-7 px-2 text-xs text-purple-700 hover:bg-purple-50"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                                    對帳備註
                                  </Button>
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyBuyerReminderText(summary.buyerName)}
                                  className="h-7 text-xs bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-600 shrink-0"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 mr-1 text-blue-500" />
                                  催繳對帳單
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </TabsContent>
                </AnimatePresence>
              </Tabs>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* AI Smart Recognition Modal (支援語音麥克風 / 手機拍照 / 圖片 / 文字檔) */}
      {/* ========================================================================= */}
      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white rounded-2xl shadow-xl">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-purple-900">
              <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
              AI 智能分析團購資訊
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-500">
              支援<strong>直接手機拍照</strong>、<strong>麥克風語音對話輸入</strong>、<strong>相簿截圖</strong>或<strong>文字檔</strong>，AI 會自動跨模式分析購買人、品項與數量！
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Multimodal Quick Input Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* 1. Camera Snapshot Trigger */}
              <button
                type="button"
                onClick={() => {
                  if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                    cameraDirectInputRef.current?.click();
                  } else {
                    openCameraFor('ai');
                  }
                }}
                className="p-3 bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-amber-900 active:scale-95 text-center"
              >
                <div className="p-2 bg-amber-200/80 text-amber-800 rounded-full">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">手機拍照</span>
                <span className="text-[10px] text-amber-700">直接拍菜單/訂單</span>
              </button>

              {/* 2. Microphone Voice Input */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 text-center ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-600 animate-pulse ring-2 ring-rose-300'
                    : 'bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className={`p-2 rounded-full ${isListening ? 'bg-white text-rose-600' : 'bg-emerald-200/80 text-emerald-800'}`}>
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </div>
                <span className="text-xs font-bold">{isListening ? '停止錄音' : '麥克風語音'}</span>
                <span className={`text-[10px] ${isListening ? 'text-white' : 'text-emerald-700'}`}>
                  {isListening ? '正在聆聽...' : '語音說出訂單'}
                </span>
              </button>

              {/* 3. Image Upload Trigger */}
              <button
                type="button"
                onClick={() => aiImageFileInputRef.current?.click()}
                className="p-3 bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-indigo-900 active:scale-95 text-center"
              >
                <div className="p-2 bg-indigo-200/80 text-indigo-800 rounded-full">
                  <ImagePlus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">相簿圖片</span>
                <span className="text-[10px] text-indigo-700">LINE截圖/照片</span>
              </button>

              {/* 4. Text File Upload Trigger */}
              <button
                type="button"
                onClick={() => aiFileInputRef.current?.click()}
                className="p-3 bg-purple-50/80 hover:bg-purple-100/90 border border-purple-200 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-purple-900 active:scale-95 text-center"
              >
                <div className="p-2 bg-purple-200/80 text-purple-800 rounded-full">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">文字檔案</span>
                <span className="text-[10px] text-purple-700">.txt, .csv 純文字</span>
              </button>
            </div>

            {/* Hidden Input Pickers */}
            <input
              type="file"
              ref={aiFileInputRef}
              className="hidden"
              accept=".txt,.csv,.log,.md,text/plain"
              onChange={handleTextFileUpload}
            />
            <input
              type="file"
              ref={aiImageFileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleAiImageUpload}
            />

            {/* Display loaded file tag */}
            {aiFileName && (
              <div className="text-xs text-purple-700 bg-purple-100/80 px-3 py-1.5 rounded-lg flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  已載入文字檔：<strong>{aiFileName}</strong>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => { setAiFileName(''); setAiRawText(''); }}
                  className="h-5 w-5 text-purple-700 hover:bg-purple-200"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Display loaded images thumbnails */}
            {aiImages.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-indigo-900 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  已加入 {aiImages.length} 張拍照 / 截圖照片：
                </p>
                <div className="flex flex-wrap gap-2 p-2 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                  {aiImages.map((imgUrl, idx) => (
                    <div key={`ai-uploaded-img-${idx}`} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-indigo-200 shadow-xs bg-white">
                      <img src={imgUrl} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeAiImage(idx)}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition-opacity"
                        title="移除圖片"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Textarea & Mic Voice Input Controller */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="aiText" className="font-semibold text-gray-700 flex items-center gap-1.5">
                  對話文字 / 語音轉錄內容
                  {isListening && (
                    <span className="text-[10px] text-rose-600 font-bold animate-pulse flex items-center gap-1">
                      <Mic className="w-3 h-3" /> 語音輸入中...
                    </span>
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 transition-all ${
                      isListening
                        ? 'bg-rose-500 text-white'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    {isListening ? '結束說話' : '開始說話輸入'}
                  </button>
                  <span className="text-gray-400">{aiRawText.length} 字</span>
                </div>
              </div>
              <textarea
                id="aiText"
                rows={4}
                value={aiRawText}
                onChange={e => setAiRawText(e.target.value)}
                placeholder="可以直接說話、貼上 LINE 訊息、或直接拍照上傳菜單：&#10;例：小明 雞排*2 150元、阿華 珍奶微糖+1 50元、小美 燙青菜+1"
                className="w-full p-3 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono bg-gray-50/50 resize-y"
              />
            </div>

            {/* Analyze Button */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={handleRunAiAnalysis}
                disabled={isAnalyzing || (!aiRawText.trim() && aiImages.length === 0)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm px-4 py-2 h-auto rounded-xl shadow-md transition-all active:scale-95"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 正在分析辨識中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    開始 AI 智慧分析
                  </>
                )}
              </Button>
            </div>

            {/* Recognized Results Preview */}
            {parsedAiItems && (
              <div className="mt-4 space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    分析結果預覽 (共 {parsedAiItems.length} 筆)
                  </h4>
                  <span className="text-[11px] text-gray-500">提示：可直接在下方微調資訊或刪除</span>
                </div>

                {parsedAiItems.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    未順利辨識到明確的訂購資訊。請確認語音、貼上的文字或照片是否包含購買人或品項名稱。
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow className="text-xs">
                          <TableHead className="w-[25%]">購買人</TableHead>
                          <TableHead className="w-[35%]">品項名稱</TableHead>
                          <TableHead className="w-[18%]">單價</TableHead>
                          <TableHead className="w-[14%]">數量</TableHead>
                          <TableHead className="w-[8%] text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedAiItems.map((item, idx) => (
                          <TableRow key={`parsed-ai-item-${idx}-${item.buyer}-${item.item}`} className="hover:bg-purple-50/30">
                            <TableCell className="p-2">
                              <Input
                                value={item.buyer}
                                onChange={e => updateParsedItem(idx, 'buyer', e.target.value)}
                                className="h-8 text-xs bg-white"
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input
                                value={item.item}
                                onChange={e => updateParsedItem(idx, 'item', e.target.value)}
                                className="h-8 text-xs bg-white"
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input
                                type="number"
                                value={item.price}
                                onChange={e => updateParsedItem(idx, 'price', parseFloat(e.target.value) || 0)}
                                placeholder="0 (現場秤重)"
                                className="h-8 text-xs bg-white"
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={e => updateParsedItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                className="h-8 text-xs bg-white"
                              />
                            </TableCell>
                            <TableCell className="p-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeParsedItem(idx)}
                                className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAiDialogOpen(false);
                if (isListening && recognitionRef.current) {
                  recognitionRef.current.stop();
                  setIsListening(false);
                }
              }}
            >
              取消
            </Button>
            {parsedAiItems && parsedAiItems.length > 0 && (
              <Button
                type="button"
                onClick={handleConfirmAiImport}
                className="bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                確認匯入訂單 (共 {parsedAiItems.length} 筆)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* Camera Capture Modal (拍照取景與存取) */}
      {/* ========================================================================= */}
      <CameraCaptureModal
        open={isCameraModalOpen}
        onOpenChange={setIsCameraModalOpen}
        onCapture={handleCameraModalCapture}
        title={
          cameraTarget === 'ai'
            ? '拍照上傳團購照片 / 菜單 (AI 辨識)'
            : cameraTarget === 'item'
            ? '拍照設定品項照片'
            : '拍照設定團購菜單'
        }
      />

      {/* Payment Note / Details Editing Modal */}
      <Dialog open={!!editingPaymentBuyer} onOpenChange={(open) => !open && setEditingPaymentBuyer(null)}>
        <DialogContent className="max-w-md p-6 bg-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-gray-900">
              <CreditCard className="w-5 h-5 text-purple-600" />
              對帳紀錄細節 — {editingPaymentBuyer}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              紀錄此買家的付款管道與對帳備註（如轉帳末五碼或現金繳交說明）。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">付款方式 / 管道</Label>
              <select
                value={paymentEditForm.paymentMethod}
                onChange={e => setPaymentEditForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full text-xs p-2 border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="銀行轉帳">銀行轉帳</option>
                <option value="LINE Pay">LINE Pay</option>
                <option value="現金繳納">現金繳納</option>
                <option value="街口支付">街口支付</option>
                <option value="信用卡">信用卡</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">對帳備註 (如帳號末五碼 / 退款備註)</Label>
              <Input
                value={paymentEditForm.paymentNote}
                onChange={e => setPaymentEditForm(prev => ({ ...prev, paymentNote: e.target.value }))}
                placeholder="例：轉帳末 5 碼 12345 / 已付現金 500"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingPaymentBuyer(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSavePaymentDetails}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs"
            >
              儲存繳費紀錄
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Editing Modal for Unpriced / Weighed Items */}
      <Dialog open={!!editingPriceEntry} onOpenChange={(open) => !open && setEditingPriceEntry(null)}>
        <DialogContent className="max-w-md p-6 bg-white rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-gray-900">
              <Edit3 className="w-5 h-5 text-amber-600" />
              補填 / 修改品項單價
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {editingPriceEntry && (
                <>為 <strong>{editingPriceEntry.buyer}</strong> 的品項 <strong>[{editingPriceEntry.item}]</strong> 設定店家現場秤重後的實際單價。</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">單價 (元)</Label>
              <Input
                type="number"
                value={priceInputVal}
                onChange={e => setPriceInputVal(e.target.value)}
                placeholder="輸入實際單價 (若填 0 則代表繼續保持現場秤重)"
                className="text-sm font-medium"
                autoFocus
              />
              <p className="text-[11px] text-gray-500">
                數量為 {editingPriceEntry?.quantity || 1} 件。輸入單價後小計為: ${((parseFloat(priceInputVal) || 0) * (editingPriceEntry?.quantity || 1)).toLocaleString()} 元
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingPriceEntry(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEntryPrice}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs"
            >
              儲存單價
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
