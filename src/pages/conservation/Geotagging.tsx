import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TreePine, Smartphone, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Green tree icon
const treeIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Tree data from user (add Ashoka entry)
const treeDataList = [
  {
    id: "TREE-004",
    species: 'Markhamia lutea',
    latitude: 0.34760,
    longitude: 32.58250,
    planted_by: 'DirtTrails Community',
    planted_on: '2025-09-25',
    count: 1,
    notes: ''
  },
  {
    id: "TREE-003",
    species: 'Markhamia lutea',
    latitude: 0.34760,
    longitude: 32.58250,
    planted_by: 'DirtTrails Community',
    planted_on: '2025-09-25',
    count: 1,
    notes: ''
  },
  {
    id: "TREE-002",
    species: 'Ficus natalensis',
    latitude: 0.55800,
    longitude: 32.45970,
    planted_by: 'MIICHub',
    planted_on: '2025-09-25',
    count: 1,
    notes: ''
  },
  {
    id: "TREE-001",
    species: 'Prunus africana',
    latitude: 1.37330,
    longitude: 32.29030,
    planted_by: 'Uganda Wildlife Authority',
    planted_on: '2025-09-25',
    count: 1,
    notes: ''
  },
  {
    id: "TREE-000",
    species: 'Ashoka',
    latitude: 0.32032,
    longitude: 32.47574,
    planted_by: 'George, Angel, Sharon, Twine',
    planted_on: '2025-09-25',
    count: 1,
    notes: ''
  }
];

const GeotaggingPage = () => {
  const [trackingId, setTrackingId] = useState('');
  const [allTrees, setAllTrees] = useState(treeDataList as any[]);
  const [selectedTree, setSelectedTree] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0.32032, 32.47574]);
  const [mapZoom, setMapZoom] = useState(10);
  const [showAddTree, setShowAddTree] = useState(false);
  const [newSpecies, setNewSpecies] = useState('');
  const [newLatitude, setNewLatitude] = useState('');
  const [newLongitude, setNewLongitude] = useState('');
  const [newPlantedBy, setNewPlantedBy] = useState('');
  const [newPlantedOn, setNewPlantedOn] = useState('');
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const mapRef = useRef<L.Map | null>(null);
  const autoCenteredRef = useRef(false);
  const approvedTrees = React.useMemo(() => {
    // Only consider trees explicitly approved. If `approved` is missing (fallback/demo data), treat as approved.
    return allTrees.filter((t: any) => (t.approved === undefined) ? true : Boolean(t.approved));
  }, [allTrees]);

  const totals = React.useMemo(() => {
    const totalTrees = approvedTrees.reduce((sum: number, t: any) => sum + (Number(t.count) || 1), 0);
    const avgKgPerTreePerYear = 21.77;
    const totalKg = totalTrees * avgKgPerTreePerYear;
    const totalTonnes = totalKg / 1000;
    return { totalTrees, totalKg, totalTonnes };
  }, [approvedTrees]);
  const navigate = useNavigate();


  

  useEffect(() => {
    const fetchTrees = async () => {
      try {
        // Fetch approved trees directly from Supabase using the anon client.
        const { data, error } = await supabase
          .from('trees')
          .select('id, external_id, species, latitude, longitude, planted_by, planted_on, images')
          .eq('approved', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase fetch error', error);
          setAllTrees(treeDataList);
        } else if (Array.isArray(data)) {
          setAllTrees(data as any[]);
        } else {
          setAllTrees(treeDataList);
        }
      } catch (error) {
        console.error('Error fetching trees:', error);
        setAllTrees(treeDataList);
      }
    };

    fetchTrees();
    const interval = setInterval(fetchTrees, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
        },
        () => {
          setUserLocation(null);
        }
      );
    }
  }, []);

  const handleTreeIdSearch = (id?: string) => {
    const searchId = id || trackingId.trim();
    if (!searchId) return;
    const foundTree = approvedTrees.find(tree => ((tree.external_id || tree.id) || '').toLowerCase() === searchId.toLowerCase() || (tree.id || '').toLowerCase() === searchId.toLowerCase());
    if (foundTree && mapRef.current) {
      setSelectedTree(foundTree);
      setMapCenter([foundTree.latitude, foundTree.longitude]);
      setMapZoom(15);
      // prefer flyTo on the actual Leaflet map instance for smooth, consistent panning
      try {
        if (mapRef.current) {
          mapRef.current.flyTo([foundTree.latitude, foundTree.longitude], 15, { animate: true });
        }
      } catch (e) {
        // ignore if mapRef is not a map instance yet
      }
    } else {
      setSelectedTree(null);
    }
  };

  useEffect(() => {
    // Auto-center to a demo tree only once on initial data load.
    if (approvedTrees.length > 0 && !autoCenteredRef.current) {
      autoCenteredRef.current = true;
      handleTreeIdSearch('TREE-000');
    }
  }, [approvedTrees]);

  

  const HeaderAndSearch = () => (
    <div className="mb-4 bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-2 md:px-8 pt-3 pb-2 max-w-5xl mx-auto">
        <div className="flex flex-col items-center md:items-start md:w-2/3">
          <div className="inline-flex items-center justify-center p-2 bg-green-500/10 rounded-full mb-1">
            <TreePine className="h-8 w-8 md:h-10 md:w-10 text-green-600" />
          </div>
          <h1 className="text-xl md:text-3xl font-bold mb-1">Geotagging & Tree Tracking</h1>
          <div className="text-xs md:text-base text-gray-600 mb-1 text-center md:text-left">
            <span className="font-semibold text-gray-900">{totals.totalTrees}</span> trees planted, removing <span className="font-semibold text-gray-900">{Math.round(totals.totalKg).toLocaleString()}</span> kg CO₂/year.
          </div>
          <p className="text-gray-600 max-w-xs md:max-w-lg mx-auto md:mx-0 mb-1 text-xs md:text-base">
            Track, search, and celebrate your tree planting.
          </p>
          <div className="flex flex-row flex-wrap items-center gap-2 md:gap-4 justify-center md:justify-start mt-1">
            <button
              className="px-3 py-1 md:px-5 md:py-2 bg-green-700 hover:bg-green-800 text-white text-xs md:text-base font-medium rounded-md"
              onClick={() => navigate('/')}
            >
              Book Service
            </button>
            <button
              className="px-3 py-1 md:px-5 md:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-base font-medium rounded-md"
              onClick={() => setShowAddTree(true)}
            >
              Plant Tree
            </button>
            <button
              className="px-3 py-1 md:px-5 md:py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs md:text-base font-medium rounded-md"
              onClick={() => navigate('/contact')}
            >
              Contact
            </button>
            <button
              className="px-3 py-1 md:px-5 md:py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs md:text-base font-medium rounded-md"
              onClick={() => navigate('/environment/donate')}
            >
              Donate
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center md:items-end md:w-1/3 mt-2 md:mt-0">
          <div className="w-full max-w-xs md:max-w-sm">
            <label htmlFor="tracking-id" className="block text-xs md:text-base font-semibold mb-1 text-gray-700">Find My Tree</label>
            <div className="flex gap-1 md:gap-2">
              <input
                id="tracking-id"
                placeholder="Tree ID (e.g., TREE-001)"
                value={trackingId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrackingId(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleTreeIdSearch()}
                className="border px-2 py-1 md:px-4 md:py-2 rounded w-full text-xs md:text-base"
              />
              <button onClick={() => handleTreeIdSearch()} className="px-2 py-1 md:px-4 md:py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs md:text-base">Find</button>
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 mt-1">Ex: TREE-001, TREE-002</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-0 py-0 max-w-full">
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
      <div className="w-full py-4 relative overflow-hidden">
        <h2 className="text-lg font-semibold mb-2 px-2">Tourists Planting Trees</h2>
        <div className="relative" style={{ width: "100%", overflow: "hidden", height: "180px" }}>
          <div
              className="gallery-marquee flex space-x-6 absolute left-0 top-0"
            style={{
              width: "max-content",
              animation: "gallery-marquee 30s linear infinite"
            }}
          >
            {approvedTrees.length > 0 ? (
              // show approved trees only
              approvedTrees.concat(approvedTrees).slice(0, Math.max(8, approvedTrees.length * 2)).map((tree: any, idx: number) => {
                const img = Array.isArray(tree.images) && tree.images.length > 0 ? tree.images[0] : null;
                return (
                  <div className="flex-shrink-0 w-40" key={`tree-marquee-${tree.id || idx}-${idx}`}>
                    {img ? (
                      <img src={img} alt={tree.species || 'Tree image'} className="rounded-lg w-full h-28 object-cover shadow" />
                    ) : (
                      <div className="rounded-lg w-full h-28 bg-gray-100 flex items-center justify-center text-xs text-gray-500">No image</div>
                    )}
                    <div className="mt-1 text-center text-xs font-medium">{(tree.planted_by || '').slice(0,32)} {tree.species ? `— ${tree.species}` : ''}</div>
                  </div>
                );
              })
            ) : (
              // fallback to static images if no approved trees available
              [...Array(2)].flatMap((_, i) => [
                <div className="flex-shrink-0 w-64" key={`img1-${i}`}>
                  <img src="/images/Sharon1.png" alt="Tourist 1 planting" className="rounded-lg w-full h-48 object-cover shadow" />
                  <div className="mt-2 text-center text-sm font-medium">Sharon planting Markhamia lutea</div>
                </div>,
                <div className="flex-shrink-0 w-64" key={`img2-${i}`}>
                  <img src="/images/angel.png" alt="Tourist 2 planting" className="rounded-lg w-full h-48 object-cover shadow" />
                  <div className="mt-2 text-center text-sm font-medium">George & Angel with Ashoka</div>
                </div>,
                <div className="flex-shrink-0 w-64" key={`img3-${i}`}>
                  <img src="/images/Sharon.png" alt="Tourist 3 planting" className="rounded-lg w-full h-48 object-cover shadow" />
                  <div className="mt-2 text-center text-sm font-medium">MIICHub team with Ficus natalensis</div>
                </div>,
                <div className="flex-shrink-0 w-64" key={`img4-${i}`}>
                  <img src="/images/uwa.png" alt="Tourist 4 planting" className="rounded-lg w-full h-48 object-cover shadow" />
                  <div className="mt-2 text-center text-sm font-medium">Uganda Wildlife Authority - Prunus africana</div>
                </div>
              ])
            )}
          </div>
        </div>
        <style>{`\n          @keyframes gallery-marquee {\n            0% { transform: translateX(0); }\n            100% { transform: translateX(-50%); }\n          }\n          .gallery-marquee:hover {\n            animation-play-state: paused;\n          }\n        `}</style>
      </div>

      <HeaderAndSearch />

      <div className="w-full mb-8" style={{ height: "45vh", minHeight: 220, maxHeight: "60vh" }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ borderRadius: "1rem", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && (
            <Marker position={userLocation}>
              <Popup>You are here 📍</Popup>
            </Marker>
          )}
          {approvedTrees.map((tree) => (
            <Marker key={tree.id} position={[tree.latitude, tree.longitude]} icon={treeIcon}>
              <Popup>
                <div className="space-y-1">
                  <p className="font-semibold text-green-700">{tree.species}</p>
                  <p><strong>ID:</strong> {tree.external_id || tree.id}</p>
                  <p><strong>Planted By:</strong> {tree.planted_by}</p>
                  <p><strong>Planted On:</strong> {new Date(tree.planted_on).toLocaleDateString()}</p>
                  <p><strong>Location:</strong> {tree.latitude.toFixed(5)}, {tree.longitude.toFixed(5)}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {selectedTree && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-11/12 md:w-2/3 lg:w-1/2 p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setSelectedTree(null)}
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-4">{selectedTree.species}</h2>
            <p><strong>ID:</strong> {selectedTree.external_id || selectedTree.id}</p>
            <p><strong>Planted By:</strong> {selectedTree.planted_by}</p>
            <p><strong>Planted On:</strong> {new Date(selectedTree.planted_on).toLocaleDateString()}</p>
            <p><strong>Location:</strong> {selectedTree.latitude}, {selectedTree.longitude}</p>
          </div>
        </div>
      )}

      {showAddTree && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-11/12 md:w-2/3 lg:w-1/2 p-6 relative max-h-[90vh] overflow-auto">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setShowAddTree(false)}
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-4">Add a New Tree</h2>
            <div className="grid gap-3">
              <label className="text-sm">Species</label>
              <input value={newSpecies} onChange={(e) => setNewSpecies(e.target.value)} className="border rounded px-3 py-2" />
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Latitude</label>
                  <input value={newLatitude} onChange={(e) => setNewLatitude(e.target.value)} className="border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm">Longitude</label>
                  <input value={newLongitude} onChange={(e) => setNewLongitude(e.target.value)} className="border rounded px-3 py-2" />
                </div>
              </div>
              <div className="mt-2 flex gap-2 items-center">
                <button
                  onClick={() => {
                    if (!('geolocation' in navigator)) {
                      alert('Geolocation is not available in this browser.');
                      return;
                    }
                    setIsPickingLocation(true);
                    navigator.geolocation.getCurrentPosition((pos) => {
                      const lat = pos.coords.latitude.toFixed(6);
                      const lng = pos.coords.longitude.toFixed(6);
                      setNewLatitude(String(lat));
                      setNewLongitude(String(lng));
                      setIsPickingLocation(false);
                    }, (err) => {
                      console.error('Geolocation error', err);
                      alert('Unable to retrieve location. Please allow location access and try again.');
                      setIsPickingLocation(false);
                    }, { enableHighAccuracy: true, timeout: 20000 });
                  }}
                  className="px-3 py-2 rounded bg-blue-600 text-white"
                >
                  {isPickingLocation ? 'Picking…' : 'Use current location'}
                </button>
                <button onClick={() => { setNewLatitude(''); setNewLongitude(''); }} className="px-3 py-2 rounded border">Clear</button>
              </div>
              <div className="mt-2">
                <label className="text-sm">Images (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    const arr = Array.from(files);
                    // revoke previous previews
                    newImagePreviews.forEach(url => URL.revokeObjectURL(url));
                    const previews = arr.map(f => URL.createObjectURL(f));
                    setNewImagePreviews(previews);
                    setNewImageFiles(arr);
                  }}
                  className="w-full"
                />
                {newImagePreviews.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto touch-pan-x">
                    {newImagePreviews.map((src, i) => (
                      <img key={i} src={src} className="h-20 w-20 object-cover rounded flex-none" alt={`preview-${i}`} />
                    ))}
                  </div>
                )}
              </div>
              
              <label className="text-sm">Planted By</label>
              <input value={newPlantedBy} onChange={(e) => setNewPlantedBy(e.target.value)} className="border rounded px-3 py-2" />
              <label className="text-sm">Planted On</label>
              <input
                type="datetime-local"
                value={newPlantedOn}
                onChange={(e) => setNewPlantedOn(e.target.value)}
                className="border rounded px-3 py-2"
              />

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  onClick={async () => {
                    // validate
                    const lat = parseFloat(newLatitude);
                    const lng = parseFloat(newLongitude);
                    if (!newSpecies.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
                      alert('Please provide species and valid coordinates');
                      return;
                    }
                    const id = `TREE-${String(Date.now()).slice(-6)}`;
                    const plantedIso = newPlantedOn ? new Date(newPlantedOn).toISOString() : new Date().toISOString();

                    // optimistic tree object for UI
                    const newTree: any = {
                      id,
                      species: newSpecies,
                      latitude: lat,
                      longitude: lng,
                      planted_by: newPlantedBy || 'Community',
                      planted_on: plantedIso,
                      count: 1,
                      notes: '',
                      images: newImagePreviews.slice(),
                    };

                    // show immediately in UI
                    setAllTrees(prev => [newTree, ...prev]);
                    setSelectedTree(newTree);
                    setMapCenter([lat, lng]);
                    setMapZoom(15);
                    setShowAddTree(false);

                    // attempt to persist to Supabase
                    try {
                      // ensure user is signed in before attempting storage/insert
                      const session = await supabase.auth.getSession();
                      if (!session?.data?.session?.user) {
                        setErrorMsg('Please sign in to submit a tree.');
                        setTimeout(() => setErrorMsg(''), 6000);
                        return;
                      }

                      // upload images if any
                      const uploadedUrls: string[] = [];
                      if (newImageFiles.length > 0) {
                        for (const f of newImageFiles) {
                          const path = `tree-images/${id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9.\-]/g,'_')}`;
                          const { error: uploadErr } = await supabase.storage.from('tree-images').upload(path, f, { cacheControl: '3600', upsert: false });
                          if (uploadErr) {
                            console.error('Upload error', uploadErr);
                            continue;
                          }
                          const { data: urlData } = supabase.storage.from('tree-images').getPublicUrl(path);
                          if (urlData && urlData.publicUrl) uploadedUrls.push(urlData.publicUrl);
                        }
                      }

                      // insert row
                      const insertRow: any = {
                        external_id: id,
                        species: newSpecies,
                        latitude: lat,
                        longitude: lng,
                        planted_by: newPlantedBy || 'Community',
                        planted_on: plantedIso,
                        images: uploadedUrls.length > 0 ? uploadedUrls : [],
                        approved: false
                      };

                      const { data: inserted, error: insertErr } = await supabase.from('trees').insert(insertRow).select('*').single();
                      if (insertErr) {
                        console.error('Insert error', insertErr);
                        // show persistent error banner for visibility
                        setErrorMsg(insertErr.message || 'Failed to save tree to server.');
                        setTimeout(() => setErrorMsg(''), 8000);
                      } else {
                        // replace optimistic entry with inserted row (has UUID id)
                        setAllTrees(prev => [inserted, ...prev.filter(p => p.id !== newTree.id)]);
                        setSelectedTree(inserted);
                        setSuccessMsg('Tree submitted — awaiting admin approval.');
                        setTimeout(() => setSuccessMsg(''), 6000);
                      }
                    } catch (err) {
                      console.error('Persist error', err);
                      const msg = (err as any)?.message || 'Could not save tree to server. Saved locally in UI only.';
                      setErrorMsg(msg);
                      setTimeout(() => setErrorMsg(''), 8000);
                    }

                    // reset form
                    setNewSpecies(''); setNewLatitude(''); setNewLongitude(''); setNewPlantedBy(''); setNewPlantedOn('');
                    newImagePreviews.forEach(url => URL.revokeObjectURL(url));
                    setNewImagePreviews([]);
                    setNewImageFiles([]);
                  }}
                  className="bg-green-600 text-white rounded px-4 py-2"
                >
                  Add Tree
                </button>
                <button onClick={() => setShowAddTree(false)} className="border rounded px-4 py-3 w-full sm:w-auto">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto mt-10 px-2">
        <h2 className="text-xl font-semibold text-center mb-4">How Our Geotagging Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="mx-auto bg-green-500/10 p-3 rounded-full w-max">
              <TreePine className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="mt-2 font-semibold">GPS Mapping</h4>
            <p className="text-sm text-gray-600 mt-2">
              Each tree is tagged with precise GPS coordinates when planted, allowing us to
              monitor its exact location and growth over time.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto bg-green-500/10 p-3 rounded-full w-max">
              <Smartphone className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="mt-2 font-semibold">Mobile Monitoring</h4>
            <p className="text-sm text-gray-600 mt-2">
              Our local rangers use custom mobile apps to regularly document tree growth,
              health status, and surrounding biodiversity.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto bg-green-500/10 p-3 rounded-full w-max">
              <QrCode className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="mt-2 font-semibold">QR Tracking</h4>
            <p className="text-sm text-gray-600 mt-2">
              Unique QR codes on your certificate link directly to your trees' data,
              allowing you to track their progress anywhere, anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeotaggingPage;
