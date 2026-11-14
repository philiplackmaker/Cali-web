// <video-clip>: plays a short silent loop while it's on screen, with a pause/play button.
// Reduced motion: it waits for the button. A visitor's pause sticks until they press play.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

class VideoClip extends HTMLElement {
  connectedCallback() {
    this.video = this.querySelector('video');
    this.button = this.querySelector('button');
    this.label = this.querySelector('[data-video-label]');
    // With JS, our button replaces the browser's controls.
    this.video.controls = false;
    this.button.hidden = false;
    this.userPaused = reduceMotion.matches;

    this.button.addEventListener('click', () => {
      this.userPaused = !this.video.paused;
      if (this.userPaused) this.video.pause();
      else this.play();
    });
    this.video.addEventListener('play', () => this.render());
    this.video.addEventListener('pause', () => this.render());

    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible && !this.userPaused) this.play();
        else if (!this.visible) this.video.pause();
      },
      { threshold: 0.5 },
    );
    this.observer.observe(this);
    this.render();
  }

  disconnectedCallback() {
    this.observer?.disconnect();
  }

  play() {
    this.video.preload = 'auto';
    // Browsers can refuse (e.g. Low Power Mode): then it just shows the poster and Play.
    this.video.play().catch(() => this.render());
  }

  render() {
    const playing = !this.video.paused;
    this.toggleAttribute('data-playing', playing);
    this.label.textContent = playing ? 'Pause clip' : 'Play clip';
  }
}

customElements.define('video-clip', VideoClip);
