// ProductForm.jsx — CORRECCIÓN MÍNIMA C11 aplicada:
// purchasePrice/salePrice envueltos en Number() al leer initialData. Prisma serializa
// los campos Decimal como string en el JSON (ver purchasePrice:"10" en /products), pero
// el LLM asumió que venían como number. Sin la conversión, editar un producto sin tocar
// el precio enviaba un string al PUT y el backend lo rechazaba (Zod espera z.number()).

import { useState } from 'react';

export default function ProductForm({ initialData, categories, suppliers, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    reference: initialData?.reference || '',
    purchasePrice: initialData ? Number(initialData.purchasePrice) : 0,
    salePrice: initialData ? Number(initialData.salePrice) : 0,
    currentStock: initialData?.currentStock || 0,
    minStock: initialData?.minStock || 0,
    categoryId: initialData?.categoryId || '',
    supplierId: initialData?.supplierId || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['purchasePrice', 'salePrice', 'currentStock', 'minStock'];
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '1rem', border: '1px solid #ccc', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
      <h3>{initialData ? 'Edit Product' : 'New Product'}</h3>
      <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
      <input name="description" placeholder="Description" value={formData.description} onChange={handleChange} />
      <input name="reference" placeholder="Reference" value={formData.reference} onChange={handleChange} />
      <input type="number" name="purchasePrice" placeholder="Purchase Price" value={formData.purchasePrice} onChange={handleChange} required />
      <input type="number" name="salePrice" placeholder="Sale Price" value={formData.salePrice} onChange={handleChange} required />
      <input type="number" name="currentStock" placeholder="Current Stock" value={formData.currentStock} onChange={handleChange} required />
      <input type="number" name="minStock" placeholder="Min Stock" value={formData.minStock} onChange={handleChange} required />

      <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
        <option value="">Select Category</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <select name="supplierId" value={formData.supplierId} onChange={handleChange} required>
        <option value="">Select Supplier</option>
        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <div>
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel} style={{ marginLeft: '0.5rem' }}>Cancel</button>
      </div>
    </form>
  );
}
