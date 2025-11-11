import type { DirectiveBinding } from "vue";

export const lazyDirective = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding<string>) {
    // Store the original src
    const imageSrc = binding.value;

    // Set a loading placeholder (you can customize this)
    const loadingPlaceholder =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dominant-baseline="middle" fill="%23999" font-family="sans-serif" font-size="10"%3ELoading...%3C/text%3E%3C/svg%3E';

    // Apply loading styles
    el.style.backgroundColor = "#f0f0f0";
    el.style.minHeight = "200px"; // Adjust as needed
    el.src = loadingPlaceholder;

    const loadImage = () => {
      // Create a new image to preload
      const img = new Image();

      img.onload = () => {
        // Once loaded, set the actual image
        el.src = imageSrc;
        el.style.backgroundColor = "";
        el.classList.remove("lazy-loading");
        el.classList.add("lazy-loaded");
      };

      img.onerror = () => {
        // Handle error state
        el.style.backgroundColor = "#fee";
        el.classList.remove("lazy-loading");
        el.classList.add("lazy-error");
      };

      // Add loading class for CSS animations
      el.classList.add("lazy-loading");

      // Start loading the image
      img.src = imageSrc;
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(([entry], obs) => {
        if (entry?.isIntersecting) {
          loadImage();
          obs.unobserve(el);
        }
      });
      observer.observe(el);
    } else {
      // Fallback: load immediately
      loadImage();
    }
  },
};
