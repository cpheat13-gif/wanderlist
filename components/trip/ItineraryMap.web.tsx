import React, { useEffect, useRef } from 'react';
import { MapStop } from '../../lib/types';

// Self-contained Leaflet + OpenStreetMap map in an iframe. Leaflet and OSM tiles
// load from CDN at runtime (no bundler/CSS config, no API key). Markers are
// numbered + colored by day; tapping one posts its day number to the parent.
function buildHtml(stops: MapStop[]): string {
  const data = JSON.stringify(stops).replace(/</g, '\\u003c');
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;background:#FDFCFA}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var stops = ${data};
var map = L.map('map', { zoomControl: true });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
var pts = [];
stops.forEach(function(s){
  var icon = L.divIcon({ className:'', iconSize:[26,26], iconAnchor:[13,13],
    html:'<div style="width:26px;height:26px;border-radius:50%;background:'+s.color+';border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:#fff;font:700 12px system-ui,-apple-system,sans-serif;cursor:pointer">'+s.dayNumber+'</div>' });
  var m = L.marker([s.lat, s.lng], { icon: icon, title: s.title }).addTo(map);
  m.on('click', function(){ try { parent.postMessage({ type:'gc-day', day: s.dayNumber }, '*'); } catch(e){} });
  pts.push([s.lat, s.lng]);
});
if (pts.length > 1) { map.fitBounds(pts, { padding:[44,44] }); }
else if (pts.length === 1) { map.setView(pts[0], 13); }
else { map.setView([20, 0], 2); }
</script></body></html>`;
}

export function ItineraryMap({ stops, onSelectDay }: { stops: MapStop[]; onSelectDay?: (day: number) => void }) {
  const cbRef = useRef(onSelectDay);
  cbRef.current = onSelectDay;

  useEffect(() => {
    function handler(e: MessageEvent) {
      const d = e?.data as { type?: string; day?: number } | undefined;
      if (d && d.type === 'gc-day' && typeof d.day === 'number') cbRef.current?.(d.day);
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return React.createElement('iframe', {
    srcDoc: buildHtml(stops),
    title: 'Itinerary map',
    style: { border: 'none', width: '100%', height: '100%', display: 'block' },
  });
}
