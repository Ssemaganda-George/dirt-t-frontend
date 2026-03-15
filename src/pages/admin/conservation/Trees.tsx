import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

type Tree = {
  id: string;
  external_id?: string;
  species: string;
  latitude: number;
  longitude: number;
  planted_by?: string;
  planted_on?: string;
  images?: string[];
  approved?: boolean;
  created_at?: string;
};

const AdminConservationTrees = () => {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [approvedFilter, setApprovedFilter] = useState<'all'|'approved'|'unapproved'>('all');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [editingTree, setEditingTree] = useState<Tree | null>(null);
  const [editSpecies, setEditSpecies] = useState('');
  const [editLatitude, setEditLatitude] = useState<string>('');
  const [editLongitude, setEditLongitude] = useState<string>('');
  const [editPlantedBy, setEditPlantedBy] = useState('');
  const [editPlantedOn, setEditPlantedOn] = useState('');
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editPreviews, setEditPreviews] = useState<string[]>([]);

  const fetchTrees = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('trees').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching trees', error);
      setTrees([]);
    } else {
      setTrees((data || []) as Tree[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrees(); }, []);

  const uniqueSpecies = Array.from(new Set(trees.map(t => t.species).filter(Boolean)));

  const filteredTrees = trees.filter(t => {
    if (search) {
      const s = search.toLowerCase();
      const matchesId = ((t.external_id || t.id) || '').toLowerCase().includes(s);
      const matchesSpecies = (t.species || '').toLowerCase().includes(s);
      const matchesPlantedBy = (t.planted_by || '').toLowerCase().includes(s);
      if (!(matchesId || matchesSpecies || matchesPlantedBy)) return false;
    }
    if (approvedFilter === 'approved' && !t.approved) return false;
    if (approvedFilter === 'unapproved' && t.approved) return false;
    if (speciesFilter && t.species !== speciesFilter) return false;
    if (dateFrom) {
      const dt = t.planted_on ? new Date(t.planted_on) : null;
      if (!dt || dt < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const dt = t.planted_on ? new Date(t.planted_on) : null;
      // include whole day for dateTo
      const end = new Date(dateTo);
      end.setHours(23,59,59,999);
      if (!dt || dt > end) return false;
    }
    return true;
  });

  const toggleApprove = async (id: string, approved?: boolean) => {
    const confirmMsg = approved ? 'Unapprove this tree? It will be hidden from the public map.' : 'Approve this tree? It will become visible on the public map.';
    if (!confirm(confirmMsg)) return;
    setLoading(true);
    const { error } = await supabase.from('trees').update({ approved: !approved }).eq('id', id);
    setLoading(false);
    if (error) {
      console.error('Approve error', error);
      setErrorMsg('Failed to update approval: ' + (error.message || 'unknown'));
      setTimeout(() => setErrorMsg(''), 6000);
    } else {
      setSuccessMsg(approved ? 'Tree unapproved.' : 'Tree approved.');
      setTimeout(() => setSuccessMsg(''), 6000);
      fetchTrees();
    }
  };

  const removeTree = async (id: string) => {
    if (!confirm('Delete this tree? This action cannot be undone.')) return;
    setLoading(true);
    const { error } = await supabase.from('trees').delete().eq('id', id);
    setLoading(false);
    if (error) {
      console.error('Delete error', error);
      setErrorMsg('Failed to delete: ' + (error.message || 'unknown'));
      setTimeout(() => setErrorMsg(''), 6000);
    } else {
      setSuccessMsg('Tree deleted.');
      setTimeout(() => setSuccessMsg(''), 6000);
      fetchTrees();
    }
  };

  const openEdit = (t: Tree) => {
    setEditingTree(t);
    setEditSpecies(t.species || '');
    setEditLatitude(t.latitude?.toString() || '');
    setEditLongitude(t.longitude?.toString() || '');
    setEditPlantedBy(t.planted_by || '');
    setEditPlantedOn(t.planted_on ? new Date(t.planted_on).toISOString().slice(0,16) : '');
    setEditFiles([]);
    setEditPreviews([]);
  };

  const closeEdit = () => {
    setEditingTree(null);
    setEditFiles([]);
    setEditPreviews([]);
  };

  const onEditFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setEditFiles(files);
    const urls = files.map(f => URL.createObjectURL(f));
    setEditPreviews(urls);
  };

  const deleteExistingImage = async (imgUrl: string) => {
    if (!editingTree) return;
    if (!confirm('Delete this image? This will remove it from the tree and attempt to delete the stored file.')) return;
    setLoading(true);
    try {
      const currentImages: string[] = Array.isArray(editingTree.images) ? [...editingTree.images] : [];
      const newImages = currentImages.filter(u => u !== imgUrl);
      // update DB
      const { error: dbErr } = await supabase.from('trees').update({ images: newImages }).eq('id', editingTree.id);
      if (dbErr) throw dbErr;

      // attempt to delete storage object if we can derive a path
      let path: string | null = null;
      const marker = '/storage/v1/object/public/tree-images/';
      if (imgUrl.includes(marker)) {
        path = imgUrl.split(marker)[1];
      } else if (imgUrl.includes('/object/tree-images/')) {
        path = imgUrl.split('/object/tree-images/')[1];
      }
      if (path) {
        // some URLs may accidentally include leading 'tree-images/' in the path
        if (path.startsWith('tree-images/')) path = path.slice('tree-images/'.length);
        path = decodeURIComponent(path);
        try {
          const { error: remErr } = await supabase.storage.from('tree-images').remove([path]);
          if (remErr) console.warn('Failed to remove storage object', remErr.message || remErr);
        } catch (e) {
          console.warn('Storage remove error', e);
        }
      }

      // update local UI
      setEditingTree({ ...editingTree, images: newImages });
      setSuccessMsg('Image removed.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Delete image error', err);
      setErrorMsg('Failed to delete image: ' + (err?.message || String(err)));
      setTimeout(() => setErrorMsg(''), 8000);
    }
    setLoading(false);
  };

  const saveEdit = async () => {
    if (!editingTree) return;
    setLoading(true);
    try {
      const newImages: string[] = Array.isArray(editingTree.images) ? [...editingTree.images] : [];
      // upload files if any
      for (const file of editFiles) {
        const path = `${editingTree.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('tree-images').upload(path, file, { upsert: false });
        if (uploadError) {
          throw uploadError;
        }
        // construct public url
        const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tree-images/${encodeURIComponent(path)}`;
        newImages.push(publicUrl);
      }

      const updates: any = {
        species: editSpecies,
        latitude: parseFloat(editLatitude) || null,
        longitude: parseFloat(editLongitude) || null,
        planted_by: editPlantedBy || null,
        planted_on: editPlantedOn ? new Date(editPlantedOn).toISOString() : null,
        images: newImages,
      };

      const { error } = await supabase.from('trees').update(updates).eq('id', editingTree.id);
      if (error) throw error;
      setSuccessMsg('Tree updated.');
      setTimeout(() => setSuccessMsg(''), 6000);
      closeEdit();
      fetchTrees();
    } catch (err: any) {
      console.error('Save edit error', err);
      setErrorMsg('Failed to save changes: ' + (err?.message || String(err)));
      setTimeout(() => setErrorMsg(''), 8000);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4">
      {successMsg && (
        <div className="fixed top-6 right-6 z-50">
          <div className="bg-emerald-600 text-white px-4 py-2 rounded shadow">{successMsg}</div>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 left-6 z-50">
          <div className="bg-red-600 text-white px-4 py-2 rounded shadow">{errorMsg}</div>
        </div>
      )}
      <h1 className="text-2xl font-semibold mb-4">Conservation — Trees</h1>
      <p className="text-sm text-gray-600 mb-4">Manage submitted trees. Approve to make them visible on the public map.</p>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, species, planted by" className="border px-3 py-2 rounded w-64" />
        <select value={approvedFilter} onChange={e => setApprovedFilter(e.target.value as any)} className="border px-2 py-2 rounded">
          <option value="all">All</option>
          <option value="approved">Approved</option>
          <option value="unapproved">Unapproved</option>
        </select>
        <select value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)} className="border px-2 py-2 rounded">
          <option value="">All species</option>
          {uniqueSpecies.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="text-sm">From <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="ml-1 border rounded px-2" /></label>
        <label className="text-sm">To <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="ml-1 border rounded px-2" /></label>
        <button onClick={() => { setSearch(''); setApprovedFilter('all'); setSpeciesFilter(''); setDateFrom(''); setDateTo(''); }} className="ml-2 px-3 py-2 bg-gray-200 rounded">Reset</button>
        <button onClick={() => fetchTrees()} className="ml-2 px-3 py-2 bg-green-600 text-white rounded">Refresh</button>
      </div>

      {loading ? <div>Loading…</div> : (
        <div className="overflow-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="text-left">
                <th className="p-2">ID</th>
                <th className="p-2">Species</th>
                <th className="p-2">Coords</th>
                <th className="p-2">Planted By</th>
                <th className="p-2">Planted On</th>
                <th className="p-2">Images</th>
                <th className="p-2">Approved</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrees.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="p-2 align-top">
                    <div className="font-medium">{t.external_id || t.id}</div>
                    {t.external_id && <div className="text-xs text-gray-500 font-mono mt-1">{t.id}</div>}
                  </td>
                  <td className="p-2 align-top">{t.species}</td>
                  <td className="p-2 align-top">{t.latitude?.toFixed(6)}, {t.longitude?.toFixed(6)}</td>
                  <td className="p-2 align-top">{t.planted_by}</td>
                  <td className="p-2 align-top">{t.planted_on ? new Date(t.planted_on).toLocaleString() : ''}</td>
                  <td className="p-2 align-top">
                    {Array.isArray(t.images) && t.images.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto">
                        {t.images.map((u, i) => <img key={i} src={u} alt={`img-${i}`} className="h-12 w-12 object-cover rounded" />)}
                      </div>
                    ) : <span className="text-xs text-gray-500">—</span>}
                  </td>
                  <td className="p-2 align-top">{t.approved ? 'Yes' : 'No'}</td>
                  <td className="p-2 align-top">
                    <div className="flex gap-2">
                      <button onClick={() => toggleApprove(t.id, t.approved)} className="px-2 py-1 rounded bg-blue-600 text-white text-sm">{t.approved ? 'Unapprove' : 'Approve'}</button>
                      <button onClick={() => openEdit(t)} className="px-2 py-1 rounded border text-sm">Edit</button>
                      <button onClick={() => removeTree(t.id)} className="px-2 py-1 rounded border text-sm">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editingTree && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black opacity-40" onClick={closeEdit} />
          <div className="bg-white rounded shadow-lg w-full max-w-2xl p-6 relative z-10">
            <h2 className="text-lg font-semibold mb-3">Edit tree — {editingTree.external_id || editingTree.id}</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col"><span className="text-sm">Species</span>
                <input value={editSpecies} onChange={e => setEditSpecies(e.target.value)} className="border px-2 py-1 rounded" />
              </label>
              <label className="flex flex-col"><span className="text-sm">Planted By</span>
                <input value={editPlantedBy} onChange={e => setEditPlantedBy(e.target.value)} className="border px-2 py-1 rounded" />
              </label>
              <label className="flex flex-col"><span className="text-sm">Latitude</span>
                <input value={editLatitude} onChange={e => setEditLatitude(e.target.value)} className="border px-2 py-1 rounded" />
              </label>
              <label className="flex flex-col"><span className="text-sm">Longitude</span>
                <input value={editLongitude} onChange={e => setEditLongitude(e.target.value)} className="border px-2 py-1 rounded" />
              </label>
              <label className="flex flex-col col-span-2"><span className="text-sm">Planted On (date & time)</span>
                <input type="datetime-local" value={editPlantedOn} onChange={e => setEditPlantedOn(e.target.value)} className="border px-2 py-1 rounded" />
              </label>
              <label className="flex flex-col col-span-2"><span className="text-sm">Add Images</span>
                <input type="file" multiple accept="image/*" onChange={onEditFilesChange} className="mt-1" />
                <div className="flex gap-2 mt-2">
                  {Array.isArray(editingTree?.images) && editingTree.images.length > 0 ? (
                    editingTree.images.map((src, i) => (
                      <div key={`exist-${i}`} className="relative">
                        <img src={src} className="h-20 w-20 object-cover rounded" />
                        <button type="button" onClick={() => deleteExistingImage(src)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs">×</button>
                      </div>
                    ))
                  ) : null}
                  {editPreviews.map((p, i) => (
                    <div key={`new-${i}`} className="relative">
                      <img src={p} className="h-20 w-20 object-cover rounded" />
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">Existing images will be preserved and new uploads appended. Use the × button to remove an existing image.</div>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeEdit} className="px-3 py-2 rounded border">Cancel</button>
              <button onClick={saveEdit} className="px-3 py-2 rounded bg-green-600 text-white">Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConservationTrees;
