self.addEventListener("install", function(event) {
	event.waitUntil(
		caches.open("video-store").then(function(cache) {
			return cache.addAll(["index.html", "index.js", 
				"https://cdn.jsdelivr.net/npm/bulma@0.8.0/css/bulma.min.css"]);
		})
	);
});

self.addEventListener("fetch", function(event) {
	event.respondWith(
		caches.match(event.request).then(function(response) {
			return response || fetch(event.request);
		})
	);
});
