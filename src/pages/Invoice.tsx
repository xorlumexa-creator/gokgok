import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Printer, MessageCircle, Receipt, MapPin, Phone, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/context/StoreContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useEffect } from 'react';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';

const INVOICE_STORAGE_KEY = 'dukan360_invoice_settings';

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitName: string;
  pricePerUnit: number;
  totalPrice: number;
}

interface InvoiceData {
  invoiceNo: string;
  date: Date;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'mobile' | 'due';
  dueAmount: number;
  shopName: string;
  shopAddress: string;
}

const loadSavedSettings = () => {
  try {
    const saved = localStorage.getItem(INVOICE_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
};

const saveSettings = (phone: string, location: string) => {
  try {
    localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify({ phone, location }));
  } catch {}
};

export default function Invoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeInfo } = useStore();
  const printRef = useRef<HTMLDivElement>(null);
  const savedSettings = useRef(loadSavedSettings());
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');

  const [invoiceData, setInvoiceData] = useState<InvoiceData>(() => {
    const state = location.state as any;
    if (state?.invoiceData) {
      return {
        ...state.invoiceData,
        shopName: state.invoiceData.shopName || storeInfo?.name || '',
        shopAddress: state.invoiceData.shopAddress || storeInfo?.location || '',
      };
    }
    return {
      invoiceNo: `INV-${Date.now().toString(36).toUpperCase()}`,
      date: new Date(), customerName: '', customerPhone: '',
      items: [], subtotal: 0, discount: 0, total: 0,
      paymentMethod: 'cash', dueAmount: 0,
      shopName: storeInfo?.name || '', shopAddress: storeInfo?.location || '',
    };
  });

  const [discount, setDiscount] = useState(invoiceData.discount.toString());
  const [whatsappPhone, setWhatsappPhone] = useState(invoiceData.customerPhone || savedSettings.current?.phone || '');
  const [shopLocation, setShopLocation] = useState(invoiceData.shopAddress || savedSettings.current?.location || storeInfo?.location || '');
  const [shopPhone, setShopPhone] = useState(savedSettings.current?.phone || storeInfo?.phone || '');

  const subtotal = invoiceData.items.reduce((s, i) => s + i.totalPrice, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);
  const dueAmount = invoiceData.paymentMethod === 'due' ? total : invoiceData.dueAmount;

  const handlePrint = (mode: 'thermal' | 'a4') => {
    setPrintMode(mode);
    if (shopPhone || shopLocation) saveSettings(shopPhone, shopLocation);
    setTimeout(() => window.print(), 100);
  };

  const handleWhatsApp = () => {
    const phone = whatsappPhone.replace(/[^0-9+]/g, '');
    if (!phone || phone.length < 8) return;
    const itemsText = invoiceData.items.map(i => `- ${i.productName} (${i.quantity} ${i.unitName}) = ৳${i.totalPrice}`).join('\n');
    const message = `🧾 Invoice - ${invoiceData.shopName || 'Dukan 360°'}
${shopLocation ? `📍 ${shopLocation}` : ''}
${shopPhone ? `📞 ${shopPhone}` : ''}
${invoiceData.customerName ? `👤 ${invoiceData.customerName}` : ''}
📅 ${new Date(invoiceData.date).toLocaleDateString('bn-BD')}

পণ্য ও সেবা:
${itemsText}

${discountAmt > 0 ? `ছাড়: ৳${discountAmt}\n` : ''}মোট: ৳${total}
${dueAmount > 0 ? `বাকি: ৳${dueAmount}\n` : ''}
ধন্যবাদ! আবার আসবেন 😊
_Dukan 360°_`;
    window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (invoiceData.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <Receipt className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">কোন ইনভয়েস নেই</h2>
        <p className="text-muted-foreground mb-6">বিক্রি সম্পন্ন করার পর ইনভয়েস তৈরি হবে</p>
        <Button onClick={() => navigate('/sell')} className="btn-primary rounded-xl">বিক্রি করুন</Button>
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-invoice, #print-invoice * { visibility: visible !important; }
          #print-invoice {
            position: absolute !important; left: 0 !important; top: 0 !important;
            margin: 0 !important; color: black !important; background: white !important;
          }
          .no-print, nav, header, footer, .print\\:hidden, [data-lovable], iframe {
            display: none !important; visibility: hidden !important;
          }
        }
        @media print {
          #print-invoice.thermal-mode {
            width: 58mm !important; max-width: 58mm !important;
            padding: 3mm !important; font-family: 'Courier New', monospace !important; font-size: 11px !important;
          }
          #print-invoice.thermal-mode .a4-only { display: none !important; }
          @page { size: ${printMode === 'thermal' ? '58mm auto' : 'A4'}; margin: ${printMode === 'thermal' ? '0' : '10mm'}; }
        }
        @media print {
          #print-invoice.a4-mode {
            width: 210mm !important; min-height: 297mm !important;
            padding: 15mm !important; font-family: Arial, sans-serif !important; font-size: 13px !important;
          }
          #print-invoice.a4-mode .thermal-only { display: none !important; }
        }
      `}</style>

      <div className="space-y-6 animate-fade-in print:hidden">
        {/* Header */}
        <div className="flex items-center gap-3 no-print">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">ইনভয়েস</h1>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="card-elevated p-5 space-y-4">
          <div className="text-center border-b border-border pb-4">
            <h2 className="text-xl font-bold text-foreground">{invoiceData.shopName || 'আমার দোকান'}</h2>
            <div className="flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" value={shopLocation} onChange={(e) => setShopLocation(e.target.value)}
                placeholder="দোকানের ঠিকানা লিখুন"
                className="text-sm text-muted-foreground bg-transparent border-b border-dashed border-border text-center focus:outline-none focus:border-primary w-full max-w-[250px]" />
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <input type="tel" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)}
                placeholder="দোকানের ফোন নম্বর"
                className="text-sm text-muted-foreground bg-transparent border-b border-dashed border-border text-center focus:outline-none focus:border-primary w-full max-w-[200px]" />
            </div>
            <div className="flex justify-between mt-3 text-xs text-muted-foreground">
              <span>#{invoiceData.invoiceNo}</span>
              <span>{new Date(invoiceData.date).toLocaleString('bn-BD')}</span>
            </div>
          </div>

          {(invoiceData.customerName || invoiceData.customerPhone) && (
            <div className="p-3 bg-muted/50 rounded-xl">
              {invoiceData.customerName && <p className="font-medium text-foreground">{invoiceData.customerName}</p>}
              {invoiceData.customerPhone && <p className="text-sm text-muted-foreground">{invoiceData.customerPhone}</p>}
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground pb-2 border-b border-border">
              <span className="col-span-5">পণ্য</span>
              <span className="col-span-3 text-center">পরিমাণ</span>
              <span className="col-span-2 text-right">দাম</span>
              <span className="col-span-2 text-right">মোট</span>
            </div>
            {invoiceData.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 text-sm py-2 border-b border-border/50">
                <span className="col-span-5 font-medium text-foreground">{item.productName}</span>
                <span className="col-span-3 text-center text-muted-foreground">{item.quantity} {item.unitName}</span>
                <span className="col-span-2 text-right text-muted-foreground">৳{item.pricePerUnit}</span>
                <span className="col-span-2 text-right font-medium text-foreground">৳{item.totalPrice}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">সাবটোটাল:</span>
              <span className="text-foreground">৳{subtotal}</span>
            </div>
            <div className="flex items-center justify-between text-sm no-print">
              <span className="text-muted-foreground">ছাড়:</span>
              <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="০" className="w-24 text-right input-field py-1 px-2 text-sm" min="0" />
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
              <span className="text-foreground">মোট:</span>
              <span className="text-primary">৳{total}</span>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-xl no-print">
            <p className="text-sm text-muted-foreground mb-2">পেমেন্ট:</p>
            <div className="flex gap-2">
              {(['cash', 'mobile', 'due'] as const).map(method => (
                <button key={method} onClick={() => setInvoiceData(prev => ({ ...prev, paymentMethod: method }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    invoiceData.paymentMethod === method
                      ? method === 'due' ? 'bg-destructive/10 text-destructive border-2 border-destructive' : 'bg-primary/10 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground border-2 border-transparent'
                  }`}>
                  {method === 'cash' ? '💵 নগদ' : method === 'mobile' ? '📱 মোবাইল' : '📝 বাকি'}
                </button>
              ))}
            </div>
            {invoiceData.paymentMethod === 'due' && <p className="text-sm text-destructive font-medium mt-2">বাকি: ৳{total}</p>}
          </div>
        </div>

        {/* WhatsApp Phone */}
        <div className="card-elevated p-4 space-y-3 no-print">
          <p className="text-sm font-medium text-foreground">📲 WhatsApp এ পাঠাতে নম্বর দিন:</p>
          <PhoneInputWithCode value={whatsappPhone} onChange={setWhatsappPhone} />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 no-print">
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => handlePrint('thermal')} className="py-5 text-sm rounded-xl bg-foreground text-background hover:bg-foreground/90" size="lg">
              <Printer className="w-5 h-5 mr-1" />
              🧾 রসিদ (Thermal)
            </Button>
            <Button onClick={() => handlePrint('a4')} variant="outline" className="py-5 text-sm rounded-xl" size="lg">
              <FileText className="w-5 h-5 mr-1" />
              📄 A4 প্রিন্ট
            </Button>
          </div>
          <Button onClick={handleWhatsApp} disabled={!whatsappPhone || whatsappPhone.length < 8}
            className="w-full py-5 text-base rounded-xl bg-[#25D366] hover:bg-[#25D366]/90 text-white disabled:opacity-50" size="lg">
            <MessageCircle className="w-5 h-5 mr-2" />
            WhatsApp এ পাঠান
          </Button>
        </div>
      </div>

      {/* Print Layout */}
      <div id="print-invoice" ref={printRef} className={`hidden print:block ${printMode === 'thermal' ? 'thermal-mode' : 'a4-mode'}`}
        style={{ fontFamily: printMode === 'thermal' ? "'Courier New', monospace" : 'Arial, sans-serif', fontSize: printMode === 'thermal' ? '11px' : '13px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: printMode === 'thermal' ? '14px' : '22px', fontWeight: 'bold' }}>{invoiceData.shopName || 'আমার দোকান'}</div>
          {shopLocation && <div style={{ fontSize: printMode === 'thermal' ? '10px' : '12px' }}>{shopLocation}</div>}
          {shopPhone && <div style={{ fontSize: printMode === 'thermal' ? '10px' : '12px' }}>📞 {shopPhone}</div>}
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '6px 0' }} />
        
        <div style={{ fontSize: printMode === 'thermal' ? '10px' : '12px' }}>
          <div>Invoice: #{invoiceData.invoiceNo}</div>
          <div>তারিখ: {new Date(invoiceData.date).toLocaleString('bn-BD')}</div>
          {invoiceData.customerName && <div>গ্রাহক: {invoiceData.customerName}</div>}
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '6px 0' }} />

        {invoiceData.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: printMode === 'thermal' ? '10px' : '12px' }}>
            <span>{item.productName} x{item.quantity} {item.unitName}</span>
            <span>৳{item.totalPrice}</span>
          </div>
        ))}

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '6px 0' }} />
        
        {discountAmt > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span>ছাড়:</span><span>-৳{discountAmt}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: printMode === 'thermal' ? '13px' : '16px' }}>
          <span>মোট:</span><span>৳{total}</span>
        </div>
        {invoiceData.paymentMethod === 'due' && (
          <div style={{ fontSize: '11px', marginTop: '4px' }}>বাকি: ৳{total}</div>
        )}

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '6px 0' }} />
        <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '8px' }}>ধন্যবাদ! আবার আসবেন 😊</div>
        <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '4px' }}>Dukan 360°</div>
      </div>
    </>
  );
}
