import { useState } from 'react';
import { Package, Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    profit: '',
    stock: '',
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "পণ্যের নাম দিন", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateProduct(editingId, {
        name: formData.name.trim(),
        price: parseFloat(formData.price) || 0,
        profit: parseFloat(formData.profit) || 0,
        stock: parseInt(formData.stock) || 0,
      });
      toast({ title: "পণ্য আপডেট হয়েছে ✓" });
    } else {
      addProduct({
        name: formData.name.trim(),
        price: parseFloat(formData.price) || 0,
        profit: parseFloat(formData.profit) || 0,
        stock: parseInt(formData.stock) || 0,
      });
      toast({ title: "নতুন পণ্য যোগ হয়েছে ✓" });
    }

    resetForm();
  };

  const handleEdit = (product: typeof products[0]) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      profit: product.profit.toString(),
      stock: product.stock.toString(),
    });
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    toast({ title: "পণ্য মুছে ফেলা হয়েছে" });
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ name: '', price: '', profit: '', stock: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">পণ্যসমূহ</h1>
            <p className="text-muted-foreground">{products.length}টি পণ্য</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="btn-primary rounded-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          নতুন পণ্য
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="পণ্য খুঁজুন..."
          className="input-field pl-10"
        />
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-soft border border-border p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingId ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য যোগ করুন'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">পণ্যের নাম</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="পণ্যের নাম লিখুন"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">মূল্য (৳)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    className="input-field"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">লাভ / ইউনিট (৳)</label>
                  <input
                    type="number"
                    value={formData.profit}
                    onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                    placeholder="0"
                    className="input-field"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">স্টক সংখ্যা</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                  className="input-field"
                  min="0"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1 py-5 rounded-xl">
                  বাতিল
                </Button>
                <Button onClick={handleSubmit} className="flex-1 btn-primary py-5 rounded-xl">
                  {editingId ? 'আপডেট করুন' : 'যোগ করুন'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="space-y-3">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="card-elevated p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                product.stock <= 5 ? 'bg-warning/10' : 'bg-accent'
              }`}>
                <Package className={`w-6 h-6 ${
                  product.stock <= 5 ? 'text-warning' : 'text-primary'
                }`} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{product.name}</p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-primary font-medium">৳{product.price}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-profit">+৳{product.profit} লাভ</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-lg font-bold ${
                  product.stock <= 5 ? 'text-warning' : 'text-foreground'
                }`}>
                  {product.stock}
                </p>
                <p className="text-xs text-muted-foreground">স্টক</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>কোন পণ্য পাওয়া যায়নি</p>
        </div>
      )}
    </div>
  );
}
