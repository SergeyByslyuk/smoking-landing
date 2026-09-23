(() => {
  const heroVideo = document.querySelector('.hero-background-video');
  const heroImage = document.querySelector('.hero');

  if (heroVideo && heroImage) {
    const showFallback = () => heroImage.classList.add('is-fallback');
    heroVideo.addEventListener('error', showFallback);
    heroVideo.addEventListener('stalled', showFallback);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) heroVideo.pause();
  }

  const steps = [...document.querySelectorAll('.quiz-step')];
  const nextButton = document.querySelector('#quiz-next');
  const backButton = document.querySelector('#quiz-back');
  const progressBar = document.querySelector('#progress-bar');
  const currentStep = document.querySelector('#current-step');
  const form = document.querySelector('#quiz-form');
  const success = document.querySelector('#form-success');
  let activeStep = 0;

  function showStep(index) {
    activeStep = index;
    steps.forEach((step, stepIndex) => step.classList.toggle('is-active', stepIndex === activeStep));
    currentStep.textContent = activeStep + 1;
    progressBar.style.width = `${((activeStep + 1) / steps.length) * 100}%`;
    backButton.hidden = activeStep === 0;
    nextButton.innerHTML = activeStep === steps.length - 1 ? 'Получить расчёт <span>↗</span>' : 'Дальше <span>→</span>';
  }

  function validateStep() {
    if (activeStep === 0 && !form.querySelector('input[name="event"]:checked')) {
      alert('Выберите формат мероприятия');
      return false;
    }
    if (activeStep === 3 && !document.querySelector('#phone').value.trim()) {
      document.querySelector('#phone').focus();
      return false;
    }
    return true;
  }

  nextButton.addEventListener('click', () => {
    if (!validateStep()) return;
    if (activeStep < steps.length - 1) {
      showStep(activeStep + 1);
      return;
    }
    form.querySelectorAll('.quiz-step, .quiz-controls, .quiz-progress').forEach((element) => { element.hidden = true; });
    success.hidden = false;
  });

  backButton.addEventListener('click', () => showStep(Math.max(0, activeStep - 1)));

  document.querySelectorAll('.range-input').forEach((range) => {
    const output = document.querySelector(`#${range.id.replace('-range', '-value')}`);
    const updateRange = () => {
      output.textContent = range.value;
      const percent = ((range.value - range.min) / (range.max - range.min)) * 100;
      range.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percent}%, var(--line) ${percent}%)`;
    };
    range.addEventListener('input', updateRange);
    updateRange();
  });

  document.querySelectorAll('details').forEach((detail) => {
    detail.addEventListener('toggle', () => {
      if (!detail.open) return;
      document.querySelectorAll('details[open]').forEach((other) => {
        if (other !== detail) other.removeAttribute('open');
      });
    });
  });

  document.querySelector('.menu-toggle').addEventListener('click', (event) => {
    event.preventDefault();
    const nav = document.querySelector('.desktop-nav');
    const isOpen = nav.classList.toggle('is-open');
    nav.setAttribute('aria-hidden', String(!isOpen));
  });

  document.querySelectorAll('.desktop-nav a').forEach((link) => link.addEventListener('click', () => {
    document.querySelector('.desktop-nav').classList.remove('is-open');
  }));
})();
