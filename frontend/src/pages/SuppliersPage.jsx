import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', nameFa: '', contactPerson: '', payment_terms: '' });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { setSuppliers(await api.get('/suppliers')); } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editItem) {
        await api.put(`/suppliers/${editItem.id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setShowForm(false); setEditItem(null);
      setForm({ name: '', nameFa: '', contactPerson: '', payment_terms: '' });
      load();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف تأمین‌کننده?')) return;
    try { await api.delete(`/suppliers/${id}`); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-green-900">📦 تأمین‌کنندگان | Suppliers</h1>
          <p className="text-gray-500 text-sm mt-1">مدیریت تأمین‌کنندگان و شرایط پرداخت</p>
        </div>
        <button onClick={() => { setForm({ name: '', nameFa: '', contactPerson: '', payment_terms: '' }); setEditItem(null); setShowForm(true); }} className="bg-green-900 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          + تأمین‌کننده جدید
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editItem ? '✏️ ویرایش' : '➕ جدید'}</h3>
            {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="نام انگلیسی | English Name" className="w-full px-4 py-2 border rounded-lg" required />
              <input type="text" value={form.nameFa} onChange={e => setForm({...form, nameFa: e.target.value})} placeholder="نام فارسی | Persian Name" className="w-full px-4 py-2 border rounded-lg" dir="rtl" />
              <input type="text" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} placeholder="شماره تماس | Contact" className="w-full px-4 py-2 border rounded-lg" />
              <input type="text" value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})} placeholder="شرایط پرداخت" className="w-full px-4 py-2 border rounded-lg" />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-green-900 hover:bg-green-800 text-white py-2 rounded-lg transition">ذخیره</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">در حال بارگذاری...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-green-900 text-white">
              <tr>
                <th className="px-4 py-3 text-right">#</th>
                <th className="px-4 py-3 text-right">نام</th>
                <th className="px-4 py-3 text-right">تماس</th>
                <th className="px-4 py-3 text-right">شرایط پرداخت</th>
                <th className="px-4 py-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3"><div className="font-medium">{s.name}</div>{s.nameFa ? <div className="text-xs text-gray-500" dir="rtl">{s.nameFa}</div> : null}</td>
                  <td className="px-4 py-3">{s.contactPerson || s.contact_person || s.contact || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{s.payment_terms || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => { setEditItem(s); setForm({ name: s.name, nameFa: s.nameFa || '', contactPerson: s.contactPerson || s.contact_person || '', payment_terms: s.payment_terms || '' }); setShowForm(true); }} className="text-blue-600 hover:text-blue-800 mx-1">✏️</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800 mx-1">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
