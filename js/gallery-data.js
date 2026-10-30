window.ESPARTANOS_GALLERY = fetch('/.netlify/functions/gallery', { credentials: 'omit' })
  .then(async response => {
    if (!response.ok) throw new Error('No se pudo cargar la galería. Intenta de nuevo más tarde.');
    return response.json();
  });
