import React, { useEffect, useRef } from 'react';
import { WorldMarker } from '../../lib/world';

// A prettier map than the planning one: soft CARTO "Voyager" basemap tiles,
// photo-thumbnail pins ringed by status color, and a dotted travel path.
// Everything loads from CDN at runtime — no API key.
function buildHtml(markers: WorldMarker[]): string {
  const data = JSON.stringify(markers).replace(/</g, '\\u003c');
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#map{height:100%;margin:0;background:#eaf1f6}
  .pin{position:relative;width:46px;height:46px}
  .pin .ph{width:46px;height:46px;border-radius:50%;border:3px solid var(--c);overflow:hidden;background:#dfe4ea;box-shadow:0 3px 10px rgba(0,0,0,.28)}
  .pin .ph img{width:100%;height:100%;object-fit:cover;display:block}
  .pin .tail{position:absolute;left:50%;bottom:-5px;width:10px;height:10px;background:var(--c);transform:translateX(-50%) rotate(45deg);border-radius:2px}
  .pin .badge{position:absolute;top:-3px;right:-3px;width:15px;height:15px;border-radius:50%;background:var(--c);border:2px solid #fff}
  .leaflet-popup-content{font:600 13px system-ui,-apple-system,sans-serif}
</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var markers = ${data};
var map = L.map('map', { zoomControl: true, worldCopyJump: true });
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

var pts = [];
markers.forEach(function(m){
  var inner = m.photo ? '<img src="'+m.photo+'" onerror="this.style.display=\\'none\\'"/>' : '';
  var html = '<div class="pin" style="--c:'+m.color+'"><div class="ph">'+inner+'</div><div class="tail"></div><div class="badge"></div></div>';
  var icon = L.divIcon({ className:'', iconSize:[46,56], iconAnchor:[23,51], popupAnchor:[0,-46], html: html });
  var mk = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
  var sub = m.subtitle ? '<br><span style="color:#9CA3AF;font-weight:500">'+String(m.subtitle).replace(/</g,'&lt;')+'</span>' : '';
  mk.bindPopup('<b>'+String(m.title).replace(/</g,'&lt;')+'</b>'+sub);
  mk.on('click', function(){ try{ parent.postMessage({type:'gc-place', id:m.id, status:m.status}, '*'); }catch(e){} });
  pts.push([m.lat, m.lng]);
});

// Dotted travel path in visiting order.
if (pts.length > 1) {
  L.polyline(pts, { color:'#111', weight:1.6, opacity:0.45, dashArray:'2,7' }).addTo(map);
  map.fitBounds(pts, { padding:[50,50] });
} else if (pts.length === 1) {
  map.setView(pts[0], 6);
} else {
  map.setView([20, 0], 2);
}
</script></body></html>`;
}

export function WorldMap({ markers, onSelect }: { markers: WorldMarker[]; onSelect?: (id: string, status: string) => void }) {
  const cbRef = useRef(onSelect);
  cbRef.current = onSelect;
  useEffect(() => {
    function handler(e: MessageEvent) {
      const d = e?.data as { type?: string; id?: string; status?: string } | undefined;
      if (d && d.type === 'gc-place' && typeof d.id === 'string') cbRef.current?.(d.id, d.status ?? '');
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
  return React.createElement('iframe', {
    srcDoc: buildHtml(markers),
    title: 'Travel map',
    style: { border: 'none', width: '100%', height: '100%', display: 'block' },
  });
}
