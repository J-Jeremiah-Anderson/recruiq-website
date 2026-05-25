// Shared client-side behaviors
(function () {
  // Nav scroll
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 12) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(r => io.observe(r));
  }

  // Mouse-tracking glow on cards
  document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.card').forEach(card => {
      const r = card.getBoundingClientRect();
      if (e.clientX < r.left - 200 || e.clientX > r.right + 200 ||
          e.clientY < r.top - 200 || e.clientY > r.bottom + 200) return;
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
  });

  // Count-up animation
  const countEls = document.querySelectorAll('[data-count]');
  if (countEls.length && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target;
          const target = parseFloat(el.dataset.count);
          const decimals = parseInt(el.dataset.decimals || '0', 10);
          const duration = 1800;
          const start = performance.now();
          const startVal = 0;
          const tick = (t) => {
            const p = Math.min((t - start) / duration, 1);
            // ease out cubic
            const eased = 1 - Math.pow(1 - p, 3);
            const val = startVal + (target - startVal) * eased;
            el.textContent = val.toFixed(decimals);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          cio.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    countEls.forEach(el => cio.observe(el));
  }

  // Particle field — mouse-interactive
  const pfield = document.querySelector('#particles');
  if (pfield) {
    const c = document.createElement('canvas');
    pfield.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let w, h, particles;
    // Mouse position in canvas pixel space; -9999 = "no mouse"
    const mouse = { x: -9999, y: -9999, active: false };

    const resize = () => {
      w = c.width = pfield.offsetWidth * dpr;
      h = c.height = pfield.offsetHeight * dpr;
      c.style.width = pfield.offsetWidth + 'px';
      c.style.height = pfield.offsetHeight + 'px';
      particles = Array.from({ length: 55 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        ox: 0, oy: 0,
        r: (Math.random() * 1.4 + 0.4) * dpr,
        vy: -(Math.random() * 0.25 + 0.05) * dpr,
        vx: 0,
        a: Math.random() * 0.5 + 0.2,
      }));
      particles.forEach(p => { p.ox = p.x; p.oy = p.y; });
    };
    resize();
    window.addEventListener('resize', resize);

    // Track cursor relative to the particle container
    const updateMouse = (e) => {
      const rect = pfield.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (e.clientY - rect.top) * dpr;
      mouse.active = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top && e.clientY <= rect.bottom;
    };
    window.addEventListener('mousemove', updateMouse);
    window.addEventListener('mouseleave', () => { mouse.active = false; });

    const REPEL_RADIUS = 120 * dpr;
    const LINK_RADIUS = 160 * dpr;

    let animating = true;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !animating) {
        animating = true;
        requestAnimationFrame(loop);
      } else if (document.hidden) {
        animating = false;
      }
    });

    const loop = () => {
      if (!animating) return;
      ctx.clearRect(0, 0, w, h);

      // Cursor glow halo
      if (mouse.active) {
        const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180 * dpr);
        grad.addColorStop(0, 'rgba(201,100,66,0.18)');
        grad.addColorStop(0.5, 'rgba(201,100,66,0.05)');
        grad.addColorStop(1, 'rgba(201,100,66,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(mouse.x - 200 * dpr, mouse.y - 200 * dpr, 400 * dpr, 400 * dpr);
      }

      particles.forEach(p => {
        // Drift upward
        p.y += p.vy + p.oy * 0.001;
        p.x += p.vx;
        // Damp lateral drift back toward original column
        p.vx *= 0.94;

        // Mouse repulsion + connection
        let nearMouse = 0;
        if (mouse.active) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < REPEL_RADIUS && dist > 0.01) {
            const force = (1 - dist / REPEL_RADIUS) * 0.9 * dpr;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force * 0.6;
          }
          if (dist < LINK_RADIUS) {
            const alpha = (1 - dist / LINK_RADIUS) * 0.35;
            nearMouse = (1 - dist / LINK_RADIUS);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(233,122,82,${alpha})`;
            ctx.lineWidth = 0.6 * dpr;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // Recycle when off-top
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; p.vx = 0; }
        if (p.y > h + 20) { p.y = -10; p.x = Math.random() * w; p.vx = 0; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        // Draw particle — brighter near cursor, with a coral tint
        const baseA = p.a;
        const a = baseA + nearMouse * 0.6;
        ctx.beginPath();
        const rad = p.r * (1 + nearMouse * 1.5);
        const tint = nearMouse > 0.05;
        ctx.fillStyle = tint
          ? `rgba(255,${Math.round(180 + nearMouse * 60)},${Math.round(140 + nearMouse * 60)},${Math.min(a, 1)})`
          : `rgba(255,255,255,${baseA})`;
        if (tint) {
          ctx.shadowColor = 'rgba(233,122,82,0.7)';
          ctx.shadowBlur = 8 * dpr * nearMouse;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      requestAnimationFrame(loop);
    };
    loop();
  }

  // Accordion
  document.querySelectorAll('[data-accordion]').forEach(group => {
    group.querySelectorAll('.accordion-item').forEach(item => {
      const trigger = item.querySelector('.accordion-trigger');
      trigger.addEventListener('click', () => {
        const open = item.classList.contains('open');
        group.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
        if (!open) item.classList.add('open');
      });
    });
  });
})();
