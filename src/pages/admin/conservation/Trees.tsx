import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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
  booking_id?: string;
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
  const [editBookingSearch, setEditBookingSearch] = useState('');
  const [editBookingResults, setEditBookingResults] = useState<any[]>([]);
  const [editSelectedBooking, setEditSelectedBooking] = useState<any | null>(null);

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
    setEditBookingSearch((t as any).booking_id || '');
    setEditBookingResults([]);
    setEditSelectedBooking(null);

    // if this tree already has a booking_id, try to fetch and populate it
    if (t && (t as any).booking_id) {
      (async () => {
        try {
          const { data: b, error: be } = await supabase.from('bookings').select('*').eq('id', (t as any).booking_id).single();
          if (!be && b) setEditSelectedBooking(b as any);
        } catch (e) {
          // ignore
        }
      })();
    }
  };

  const closeEdit = () => {
    setEditingTree(null);
    setEditFiles([]);
    setEditPreviews([]);
    setEditBookingSearch('');
    setEditBookingResults([]);
    setEditSelectedBooking(null);
  };

  // Add-Tree (admin) state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSpecies, setAddSpecies] = useState('');
  const [addLatitude, setAddLatitude] = useState('');
  const [addLongitude, setAddLongitude] = useState('');
  const [addPlantedBy, setAddPlantedBy] = useState('');
  const [addPlantedOn, setAddPlantedOn] = useState('');
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [addPreviews, setAddPreviews] = useState<string[]>([]);
  const [addPickingLocation, setAddPickingLocation] = useState(false);
  const [addMarkerPos, setAddMarkerPos] = useState<[number, number] | null>(null);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingResults, setBookingResults] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const onAddFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setAddFiles(files);
    const urls = files.map(f => URL.createObjectURL(f));
    setAddPreviews(urls);
  };

  const searchBookings = async (q?: string) => {
    const query = (q ?? bookingSearch).trim();
    setLoading(true);
    setBookingResults([]);
    try {
      // try exact id match first
      if (query) {
        const { data: byId, error: idErr } = await supabase.from('bookings').select('*').eq('id', query).limit(20);
        if (!idErr && Array.isArray(byId) && byId.length > 0) {
          setBookingResults(byId as any[]);
          setLoading(false);
          return;
        }
      }

      // try external_id search (if it exists) - wrapped in try/catch because column might not exist
      if (query) {
        try {
          const { data: ext, error: extErr } = await supabase.from('bookings').select('*').ilike('external_id', `%${query}%`).limit(20);
          if (!extErr && Array.isArray(ext) && ext.length > 0) {
            setBookingResults(ext as any[]);
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore if external_id not present
        }
      }

      // fallback: list recent bookings
      const { data: recent, error: recentErr } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(20);
      if (!recentErr && Array.isArray(recent)) setBookingResults(recent as any[]);
    } catch (err) {
      console.error('Bookings search error', err);
      setBookingResults([]);
    }
    setLoading(false);
  };

  const searchBookingsForEdit = async (q?: string) => {
    const query = (q ?? editBookingSearch).trim();
    setLoading(true);
    setEditBookingResults([]);
    try {
      if (query) {
        const { data: byId, error: idErr } = await supabase.from('bookings').select('*').eq('id', query).limit(20);
        if (!idErr && Array.isArray(byId) && byId.length > 0) {
          setEditBookingResults(byId as any[]);
          setLoading(false);
          return;
        }
      }
      if (query) {
        try {
          const { data: ext, error: extErr } = await supabase.from('bookings').select('*').ilike('external_id', `%${query}%`).limit(20);
          if (!extErr && Array.isArray(ext) && ext.length > 0) {
            setEditBookingResults(ext as any[]);
            setLoading(false);
            return;
          }
        } catch (e) {}
      }
      const { data: recent, error: recentErr } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(20);
      if (!recentErr && Array.isArray(recent)) setEditBookingResults(recent as any[]);
    } catch (err) {
      console.error('Bookings search error', err);
      setEditBookingResults([]);
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setAddSpecies(''); setAddLatitude(''); setAddLongitude(''); setAddPlantedBy(''); setAddPlantedOn('');
    setAddFiles([]); setAddPreviews([]);
    setAddPickingLocation(false);
    setAddMarkerPos(null);
    setBookingSearch('');
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    addPreviews.forEach(u => URL.revokeObjectURL(u));
    setAddPreviews([]); setAddFiles([]);
    setBookingSearch('');
  };

  const createTree = async () => {
    // basic validation
    const lat = addMarkerPos ? addMarkerPos[0] : parseFloat(addLatitude);
    const lng = addMarkerPos ? addMarkerPos[1] : parseFloat(addLongitude);
    if (!addSpecies.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      setErrorMsg('Provide species and valid coordinates');
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }
    setLoading(true);
    try {
      const id = `TREE-${String(Date.now()).slice(-6)}`;
      const plantedIso = addPlantedOn ? new Date(addPlantedOn).toISOString() : new Date().toISOString();

      const uploadedUrls: string[] = [];
      if (addFiles.length > 0) {
        for (const f of addFiles) {
          const path = `${id}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9.\-]/g,'_')}`;
          const { error: uploadErr } = await supabase.storage.from('tree-images').upload(path, f, { cacheControl: '3600', upsert: false });
          if (uploadErr) {
            console.warn('Upload error', uploadErr);
            continue;
          }
          const { data: urlData } = supabase.storage.from('tree-images').getPublicUrl(path);
          if (urlData && urlData.publicUrl) uploadedUrls.push(urlData.publicUrl);
        }
      }

      // accept typed booking id if provided and validate UUID format
      const typedBooking = bookingSearch ? bookingSearch.trim() : null;
      const bookingIdToSave = selectedBooking?.id || typedBooking || null;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (bookingIdToSave && !uuidRegex.test(bookingIdToSave)) {
        setErrorMsg('Booking ID must be a valid UUID.');
        setTimeout(() => setErrorMsg(''), 6000);
        setLoading(false);
        return;
      }

      const row: any = {
        external_id: id,
        species: addSpecies,
        latitude: lat,
        longitude: lng,
        planted_by: addPlantedBy || 'Admin',
        planted_on: plantedIso,
        images: uploadedUrls,
        booking_id: bookingIdToSave,
        approved: true
      };

      const { error } = await supabase.from('trees').insert(row).select('*').single();
      if (error) {
        throw error;
      }
      setSuccessMsg('Tree created.');
      setTimeout(() => setSuccessMsg(''), 4000);
      closeAddModal();
      fetchTrees();
    } catch (err: any) {
      console.error('Create tree error', err);
      setErrorMsg('Failed to create tree: ' + (err?.message || String(err)));
      setTimeout(() => setErrorMsg(''), 8000);
    }
    setLoading(false);
  };

  // small helper component to capture map clicks
  function MapClickSetter({ onClick }: { onClick: (latlng: [number, number]) => void }) {
    useMapEvents({
      click(e) {
        onClick([e.latlng.lat, e.latlng.lng]);
      }
    });
    return null;
  }

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
        const { error: uploadError } = await supabase.storage.from('tree-images').upload(path, file, { upsert: false });
        if (uploadError) {
          throw uploadError;
        }
        // construct public url
        const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tree-images/${encodeURIComponent(path)}`;
        newImages.push(publicUrl);
      }

      // accept typed booking id if provided and validate UUID format
      const typedBooking = editBookingSearch ? editBookingSearch.trim() : null;
      const bookingIdToSave = editSelectedBooking?.id || typedBooking || null;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (bookingIdToSave && !uuidRegex.test(bookingIdToSave)) {
        setErrorMsg('Booking ID must be a valid UUID.');
        setTimeout(() => setErrorMsg(''), 6000);
        setLoading(false);
        return;
      }

      const updates: any = {
        species: editSpecies,
        latitude: parseFloat(editLatitude) || null,
        longitude: parseFloat(editLongitude) || null,
        planted_by: editPlantedBy || null,
        planted_on: editPlantedOn ? new Date(editPlantedOn).toISOString() : null,
        images: newImages,
        // save validated booking id (selected or typed)
        booking_id: bookingIdToSave,
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
        <button onClick={openAddModal} className="ml-2 px-3 py-2 bg-indigo-600 text-white rounded">Add Tree</button>
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
          <div className="bg-white rounded shadow-lg w-full max-w-2xl p-6 relative z-10 max-h-[80vh] overflow-auto">
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
              <label className="flex flex-col col-span-2"><span className="text-sm">Attach Booking (optional)</span>
                <div className="flex gap-2">
                  <input value={editBookingSearch} onChange={e => setEditBookingSearch(e.target.value)} placeholder="Search booking ID or external ID" className="flex-1 border px-2 py-1 rounded" />
                  <button onClick={() => searchBookingsForEdit()} className="px-2 py-1 border rounded bg-gray-50 text-xs">Search</button>
                </div>
                <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">You can type a booking ID directly and save, or search to validate.</div>
                    {editSelectedBooking ? (
                    <div className="p-2 border rounded bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">{editSelectedBooking.external_id || editSelectedBooking.id}</div>
                          <div className="text-xs text-gray-600">{editSelectedBooking.service_name || editSelectedBooking.product_name || editSelectedBooking.title || ''}</div>
                          <div className="text-xs text-gray-600">{editSelectedBooking.vendor_name || editSelectedBooking.provider_name || ''}</div>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          {editSelectedBooking.start_at ? new Date(editSelectedBooking.start_at).toLocaleString() : ''}
                          <div>{editSelectedBooking.total ? `${editSelectedBooking.currency || ''} ${editSelectedBooking.total}` : ''}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button onClick={() => setEditSelectedBooking(null)} className="text-xs text-red-600">Remove</button>
                      </div>
                    </div>
                    ) : (
                    editBookingResults.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-auto">
                        {editBookingResults.map(b => (
                          <button key={b.id} onClick={() => setEditSelectedBooking(b)} className="text-left p-2 border rounded hover:bg-gray-50 text-sm">
                            <div className="font-medium">{b.external_id || b.id}</div>
                            <div className="text-xs text-gray-600">{b.service_name || b.product_name || b.title || ''} {b.vendor_name ? `— ${b.vendor_name}` : ''}</div>
                            <div className="text-xs text-gray-500">{b.start_at ? new Date(b.start_at).toLocaleString() : ''} {b.total ? ` • ${b.currency || ''} ${b.total}` : ''}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 mt-2">No booking selected. You can type an ID above or search to attach a booking.</div>
                    )
                  )}
                </div>
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
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black opacity-40" onClick={closeAddModal} />
          <div className="bg-white rounded shadow-lg w-full max-w-2xl p-6 relative z-10 max-h-[80vh] overflow-auto">
            <h2 className="text-lg font-semibold mb-4">Add Tree (admin)</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
                  <input value={addSpecies} onChange={e => setAddSpecies(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Planted By</label>
                  <input value={addPlantedBy} onChange={e => setAddPlantedBy(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input value={addLatitude} onChange={e => setAddLatitude(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input value={addLongitude} onChange={e => setAddLongitude(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => setAddPickingLocation(p => !p)} className="w-full px-2 py-1 border rounded bg-gray-50 text-xs text-center h-9">{addPickingLocation ? 'Close map' : 'Pick on map'}</button>
                  <button type="button" onClick={async () => {
                    if (!('geolocation' in navigator)) { alert('Geolocation not available'); return; }
                    try {
                      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 20000 }));
                      const lat = pos.coords.latitude.toFixed(6);
                      const lng = pos.coords.longitude.toFixed(6);
                      setAddLatitude(String(lat)); setAddLongitude(String(lng));
                      setAddMarkerPos([parseFloat(lat), parseFloat(lng)]);
                    } catch (e) {
                      console.error('Geolocation error', e);
                      alert('Unable to get current location');
                    }
                  }} className="w-full px-2 py-1 border rounded bg-gray-50 text-xs text-center h-9">Use current</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planted On (date & time)</label>
                <input type="datetime-local" value={addPlantedOn} onChange={e => setAddPlantedOn(e.target.value)} className="w-full border rounded px-3 py-2" />
                <div className="text-xs text-gray-500 mt-1">{addPlantedOn ? new Date(addPlantedOn).toLocaleString() : 'dd/mm/yyyy, --:--'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attach Booking (optional)</label>
                <div className="flex gap-2">
                  <input value={bookingSearch} onChange={e => setBookingSearch(e.target.value)} placeholder="Search booking ID or external ID" className="flex-1 border rounded px-3 py-2" />
                  <button onClick={() => searchBookings()} className="px-3 py-2 border rounded bg-gray-50">Search</button>
                </div>
                <div className="mt-2">
                  {selectedBooking ? (
                    <div className="p-2 border rounded bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">{selectedBooking.external_id || selectedBooking.id}</div>
                          <div className="text-xs text-gray-600">{selectedBooking.service_name || selectedBooking.product_name || selectedBooking.title || ''}</div>
                          <div className="text-xs text-gray-600">{selectedBooking.vendor_name || selectedBooking.provider_name || ''}</div>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          {selectedBooking.start_at ? new Date(selectedBooking.start_at).toLocaleString() : ''}
                          <div>{selectedBooking.total ? `${selectedBooking.currency || ''} ${selectedBooking.total}` : ''}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button onClick={() => setSelectedBooking(null)} className="text-xs text-red-600">Remove</button>
                      </div>
                    </div>
                  ) : (
                    bookingResults.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-auto">
                        {bookingResults.map(b => (
                          <button key={b.id} onClick={() => setSelectedBooking(b)} className="text-left p-2 border rounded hover:bg-gray-50 text-sm">
                            <div className="font-medium">{b.external_id || b.id}</div>
                            <div className="text-xs text-gray-600">{b.service_name || b.product_name || b.title || ''} {b.vendor_name ? `— ${b.vendor_name}` : ''}</div>
                            <div className="text-xs text-gray-500">{b.start_at ? new Date(b.start_at).toLocaleString() : ''} {b.total ? ` • ${b.currency || ''} ${b.total}` : ''}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 mt-2">No booking selected. Search to attach a booking.</div>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add Images</label>
                <input type="file" multiple accept="image/*" onChange={onAddFilesChange} className="w-full" />
                {addPreviews.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {addPreviews.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p} className="h-20 w-20 object-cover rounded" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {addPickingLocation && (
                <div className="mt-2 border rounded overflow-hidden" style={{ height: 220 }}>
                  <MapContainer center={addMarkerPos || [0.32, 32.47]} zoom={10} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickSetter onClick={(latlng) => { setAddMarkerPos(latlng); setAddLatitude(String(latlng[0].toFixed(6))); setAddLongitude(String(latlng[1].toFixed(6))); }} />
                    {addMarkerPos && <Marker position={addMarkerPos} />}
                  </MapContainer>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button onClick={closeAddModal} className="px-4 py-2 rounded border">Cancel</button>
                <button onClick={createTree} className="px-4 py-2 rounded bg-indigo-600 text-white">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConservationTrees;
