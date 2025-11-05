// Beginner-friendly script to fetch data and render a gallery

// 1) Get references to DOM elements
const getImageBtn = document.getElementById('getImageBtn');
const gallery = document.getElementById('gallery');
// Random fact element
const spaceFactText = document.getElementById('spaceFactText');
const newFactBtn = document.getElementById('newFactBtn');
// Modal elements
const modal = document.getElementById('modal');
const modalCloseBtn = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalVideoContainer = document.getElementById('modalVideoContainer');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalDesc = document.getElementById('modalDesc');

// 2) API URL provided
const API_URL = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// 3) Helper: show a loading state on the button
const setLoading = (isLoading) => {
  if (isLoading) {
    getImageBtn.disabled = true;
    getImageBtn.textContent = 'Loading...';
  } else {
    getImageBtn.disabled = false;
    getImageBtn.textContent = 'Get Space Images';
  }
};

// 4) Fetch data from the API
const fetchImages = async () => {
  setLoading(true); // start loading

  // Show a friendly loading message inside the gallery while we fetch data
  // This will be replaced by the gallery content once data arrives
  gallery.setAttribute('aria-busy', 'true');
  gallery.innerHTML = `
    <div class="placeholder" role="status" aria-live="polite">
      <div class="placeholder-icon">🔄</div>
      <p>Loading space photos…</p>
    </div>
  `;

  try {
    const response = await fetch(API_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    // Parse the response JSON (array of items)
    const data = await response.json();

  // Include both images and videos that have a URL (videos are handled separately)
  const images = data.filter(item => (item.media_type === 'image' || item.media_type === 'video') && item.url);

    // Render the gallery
    renderGallery(images);
  } catch (err) {
    // Show a friendly error message
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">⚠️</div>
        <p>Sorry, something went wrong. Please try again.</p>
        <small>${err.message}</small>
      </div>
    `;
  } finally {
    setLoading(false); // end loading
    gallery.removeAttribute('aria-busy');
  }
};

// 5) Render the gallery (image + title + date)
const renderGallery = (images) => {
  if (!images || images.length === 0) {
    gallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">🛰️</div>
        <p>No images found. Please try again later.</p>
      </div>
    `;
    return;
  }

  // Helpers to support video entries
  const isYouTubeUrl = (url) => /youtube\.(com|nocookie\.com)|youtu\.be/.test(url);
  const getYouTubeId = (url) => {
    try {
      const u = new URL(url);
      // Normalize hostname
      const host = u.hostname;
      const path = u.pathname;

      // youtu.be/ID
      if (host.includes('youtu.be')) {
        return path.split('/').filter(Boolean)[0] || null;
      }

      // youtube.com and youtube-nocookie.com
      if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
        // youtube.com/watch?v=ID
        const v = u.searchParams.get('v');
        if (v) return v;
        // youtube.com/embed/ID or youtube-nocookie.com/embed/ID
        if (path.startsWith('/embed/')) {
          return path.replace('/embed/', '').split('/')[0] || null;
        }
        // youtube.com/shorts/ID
        if (path.startsWith('/shorts/')) {
          return path.replace('/shorts/', '').split('/')[0] || null;
        }
      }
    } catch (_) {}
    return null;
  };
  const getYouTubeThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

  // Create simple cards that match .gallery-item styles
  const cardsHtml = images.map(item => {
    const mediaType = item.media_type;
    const title = item.title || 'Untitled';
    const date = item.date || '';

    if (mediaType === 'video') {
      const url = item.url || '#';
      let thumbHtml = '';
      if (isYouTubeUrl(url)) {
        const vid = getYouTubeId(url);
        const thumb = vid ? getYouTubeThumb(vid) : '';
        if (thumb) {
          thumbHtml = `<img src="${thumb}" alt="${title}" loading="lazy" />`;
        }
      }
      // Fallback placeholder if no thumbnail
      if (!thumbHtml) {
        thumbHtml = `<div class="video-placeholder">🎬 Video</div>`;
      }

      return `
        <div class="gallery-item" data-media="video">
          <a href="${url}" target="_blank" rel="noopener">
            ${thumbHtml}
          </a>
          <p><strong>📺 ${title}</strong></p>
          <p>${date}</p>
        </div>
      `;
    }

    // Default: image
    const imgSrc = item.url;
    return `
      <div class="gallery-item" data-media="image">
        <a href="${imgSrc}" target="_blank" rel="noopener">
          <img src="${imgSrc}" alt="${title}" loading="lazy" />
        </a>
        <p><strong>${title}</strong></p>
        <p>${date}</p>
      </div>
    `;
  }).join('');

  gallery.innerHTML = cardsHtml;

  // After inserting the cards, attach click handlers to open the modal
  const cards = Array.from(gallery.querySelectorAll('.gallery-item'));
  cards.forEach((card, index) => {
    // We use the same index to retrieve the corresponding image data
    const item = images[index];
    const link = card.querySelector('a');

    const handleOpen = (e) => {
      // Prevent the link from navigating away; open the modal instead
      e.preventDefault();
      openModal(item);
    };

    // Open modal when clicking image/link or anywhere on the card
    link.addEventListener('click', handleOpen);
    card.addEventListener('click', (e) => {
      // Avoid double-firing when the link itself is clicked
      if (e.target.tagName.toLowerCase() !== 'a') {
        handleOpen(e);
      }
    });
  });
};

// 6) When the button is clicked, fetch and display images
getImageBtn.addEventListener('click', fetchImages);

// 7) Modal helpers
const openModal = (item) => {
  const mediaType = item.media_type;
  const title = item.title || 'Untitled';
  const date = item.date || '';
  const explanation = item.explanation || 'No description available.';

  // Reset media containers
  modalImage.style.display = 'none';
  modalImage.src = '';
  modalVideoContainer.innerHTML = '';
  modalVideoContainer.setAttribute('aria-hidden', 'true');

  if (mediaType === 'video') {
    const url = item.url || '';
    // Try to embed YouTube; otherwise provide a link in the description
    const isYouTube = /youtube\.com|youtu\.be/.test(url);
    if (isYouTube) {
      // Extract video ID and create an embed iframe
      const id = (() => {
        try {
          const u = new URL(url);
          if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
          if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
        } catch (_) {}
        return null;
      })();
      if (id) {
        const iframe = document.createElement('iframe');
        iframe.className = 'modal-video';
        iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
        iframe.title = title;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allowFullscreen = true;
        modalVideoContainer.appendChild(iframe);
        modalVideoContainer.setAttribute('aria-hidden', 'false');
      }
    }

    // If we couldn't embed, we still provide a clear link
    if (!modalVideoContainer.children.length) {
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener">Open video in new tab</a>`;
      modalDesc.innerHTML = `${explanation}<br><br>${linkHtml}`;
    } else {
      modalDesc.textContent = explanation;
    }
  } else {
    // Image: use higher-res when available
    const fullSrc = item.hdurl || item.url;
    modalImage.src = fullSrc;
    modalImage.alt = title;
    modalImage.style.display = '';
    modalDesc.textContent = explanation;
  }

  // Common fields
  modalTitle.textContent = title;
  modalDate.textContent = date;

  // Show modal
  modal.classList.add('open');
  document.body.classList.add('no-scroll');
  modalCloseBtn.focus();
};

const closeModal = () => {
  modal.classList.remove('open');
  document.body.classList.remove('no-scroll');
  // Optional: clear image src to free memory
  modalImage.src = '';
  // Remove any embedded video to stop playback
  modalVideoContainer.innerHTML = '';
};

// Close interactions: button, Escape key, and click outside content
modalCloseBtn.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) {
    closeModal();
  }
});

modal.addEventListener('click', (e) => {
  // If click is on the backdrop (not inside modal-content), close it
  if (e.target === modal) {
    closeModal();
  }
});

// 8) Random Space Fact: pick one on page load
// Store a list of short, fun facts
const SPACE_FACTS = [
  'Space is completely silent—sound can’t travel in a vacuum.',
  'A day on Venus is longer than a year on Venus.',
  'There are more stars in the universe than grains of sand on Earth.',
  'Neutron stars can spin 600 times per second.',
  'Footprints on the Moon can last for millions of years.',
  'The Sun makes up about 99.8% of our solar system’s mass.',
  'Jupiter’s Great Red Spot is a storm bigger than Earth.',
  'One day on Mercury includes two sunrises!',
  'The International Space Station orbits Earth about every 90 minutes.',
  'Light from the Sun takes about 8 minutes to reach Earth.',
  'Saturn could float in water because it’s so light (if you had a big enough tub!).',
  'Mars has the tallest volcano in the solar system—Olympus Mons.'
];

// Helper to show one random fact
let lastFactIndex = -1; // remember last index to avoid immediate repeats
const showRandomFact = () => {
  if (!spaceFactText) return; // guard if element not present
  let index = Math.floor(Math.random() * SPACE_FACTS.length);
  // Avoid the same fact twice in a row
  if (SPACE_FACTS.length > 1 && index === lastFactIndex) {
    index = (index + 1) % SPACE_FACTS.length;
  }
  const fact = SPACE_FACTS[index];
  spaceFactText.textContent = `🛰️ ${fact}`;
  lastFactIndex = index;
};

// Show a fact when the app loads
showRandomFact();

// Shuffle fact on button click
if (newFactBtn) {
  newFactBtn.addEventListener('click', showRandomFact);
}