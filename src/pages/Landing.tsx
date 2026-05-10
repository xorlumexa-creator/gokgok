import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, BookOpen, MessageCircle, BarChart3, Check, Wifi, Smartphone, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import logoImg from '@/assets/logo.png';

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  const goAuth = () => navigate('/auth');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Dukan 360°" className="w-9 h-9 rounded-lg object-cover" />
            <span className="font-bold text-lg">Dukan 360°</span>
          </div>
          <Button onClick={goAuth} className="rounded-xl px-5">শুরু করুন</Button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-10 pb-12 text-center bg-gradient-to-b from-accent/40 to-background">
        <img src={logoImg} alt="Dukan 360°" className="w-24 h-24 mx-auto rounded-2xl shadow-soft object-cover mb-5" />
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Dukan <span className="text-primary">360°</span>
        </h1>
        <p className="mt-3 text-lg sm:text-xl font-semibold">আপনার দোকানের সম্পূর্ণ ডিজিটাল সমাধান</p>
        <p className="mt-2 text-muted-foreground max-w-xl mx-auto">পণ্য, বিক্রি, বাকি — সব এক অ্যাপে। অফলাইনেও কাজ করে।</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={goAuth} className="py-6 px-8 text-lg rounded-2xl">
            ফ্রি ট্রায়াল শুরু করুন <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button onClick={goAuth} variant="outline" className="py-6 px-8 text-lg rounded-2xl">
            ডেমো দেখুন
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">১৪ দিন ফ্রি · কোনো কার্ড লাগবে না</p>
      </section>

      {/* Features */}
      <section className="px-4 py-12 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">যা যা পাবেন</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: ShoppingCart, title: 'সহজ বিক্রি হিসাব', desc: 'এক ট্যাপে বিক্রি যোগ, রসিদ তৈরি ও প্রিন্ট।' },
            { icon: BookOpen, title: 'বাকি ম্যানেজমেন্ট', desc: 'কে কত বাকি — সব এক জায়গায়, সহজে।' },
            { icon: MessageCircle, title: 'WhatsApp Reminder', desc: 'বাকির রিমাইন্ডার সরাসরি WhatsApp-এ।' },
            { icon: BarChart3, title: 'রিপোর্ট ও বিশ্লেষণ', desc: 'দৈনিক বিক্রি, লাভ, স্টক — সবকিছুর হিসাব।' },
          ].map((f, i) => (
            <div key={i} className="card-elevated p-5 rounded-2xl hover:shadow-elegant transition-shadow">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-3">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="px-4 py-12 bg-accent/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">কেন Dukan 360°?</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: Wifi, text: 'অফলাইনেও কাজ করে' },
              { icon: Sparkles, text: 'সহজ ব্যবহার' },
              { icon: Check, text: 'কম দামে সেরা সমাধান' },
              { icon: Smartphone, text: 'মোবাইলেই সব কাজ' },
            ].map((it, i) => (
              <div key={i} className="flex items-center gap-3 bg-background rounded-xl p-4 border border-border">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <it.icon className="w-5 h-5" />
                </div>
                <span className="font-medium">{it.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-12 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">সাশ্রয়ী প্ল্যান</h2>
        <p className="text-center text-muted-foreground mb-2">৩টি প্ল্যানেই একই ক্যাপাসিটি — পার্থক্য শুধু ফিচারে</p>
        <div className="text-center text-xs text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          প্রতিটি প্ল্যানে: <b className="text-foreground">১,০০০ পণ্য তালিকা</b> + <b className="text-foreground">১,০০০ বাকি গ্রাহক</b> + <b className="text-foreground">মাসিক ১৮,০০০ ডাটা ইনপুট</b><br/>
          <span className="text-rose-600">⚠️ ১৮,০০০ ক্রেডিট মাসের মাঝে শেষ হলে আবার সাবস্ক্রাইব করতে হবে। মাস শেষেও আবার সাবস্ক্রিপশন প্রয়োজন।</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { name: 'Basic', price: 80, features: ['মূল ফিচার সব', 'বাকির খাতা + পণ্য + হিসাব', 'রিপোর্ট ও বিশ্লেষণ'], highlight: false },
            { name: 'Standard', price: 140, features: ['Basic-এর সব', 'WhatsApp রিমাইন্ডার', 'সরাসরি কল বাটন'], highlight: true },
            { name: 'Pro', price: 200, features: ['Standard-এর সব', 'Thermal/A4 ইনভয়েস', 'PDF এক্সপোর্ট + WhatsApp শেয়ার'], highlight: false },
          ].map((p, i) => (
            <div key={i} className={`rounded-2xl p-6 border-2 transition-all ${p.highlight ? 'border-primary bg-primary/5 shadow-elegant scale-[1.02]' : 'border-border bg-card'}`}>
              {p.highlight && <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full mb-2">জনপ্রিয়</span>}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="mt-2"><span className="text-4xl font-extrabold">৳{p.price}</span><span className="text-muted-foreground">/মাস</span></p>
              <ul className="mt-4 space-y-2">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary shrink-0" />{f}</li>
                ))}
              </ul>
              <Button onClick={goAuth} className="w-full mt-5 rounded-xl py-5" variant={p.highlight ? 'default' : 'outline'}>শুরু করুন</Button>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="px-4 py-12 bg-accent/30 text-center">
        <p className="text-2xl font-bold">১০০+ দোকানদার ব্যবহার করছেন</p>
        <p className="text-muted-foreground mt-2">"হিসাব রাখা এত সহজ ছিল না কখনো!" — একজন দোকানদার</p>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-14 text-center">
        <h2 className="text-2xl sm:text-4xl font-extrabold">আজই আপনার দোকান ডিজিটাল করুন</h2>
        <Button onClick={goAuth} className="mt-6 py-6 px-8 text-lg rounded-2xl">
          ফ্রি ট্রায়াল শুরু করুন <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </section>

      <footer className="px-4 py-6 border-t border-border text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Dukan 360°
      </footer>
    </div>
  );
}
