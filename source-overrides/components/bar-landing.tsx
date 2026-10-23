'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { ContactSection } from '@/components/contact-section';
import { services, serviceHref } from '@/lib/services';

const faqs = [
  { id: 'cost', question: 'Как рассчитывается стоимость?', answer: 'Учитываем меню, число гостей, время работы и площадку. После разговора подготовим предложение с составом услуг и стоимостью.' },
  { id: 'equipment', question: 'Что нужно подготовить на площадке?', answer: 'Обсудим место для бара и условия подключения. У нас своя стойка, оборудование и посуда — состав комплекта согласуем под ваше мероприятие. Если нужен только бармен, уточним, что уже есть на площадке.' },
  { id: 'glassware', question: 'Можно выбрать посуду и подачу?', answer: 'Да. Можно выбрать премиальное стекло или одноразовую посуду. Подберём вариант под напитки, оформление, условия площадки и бюджет.' },
  { id: 'menu', question: 'Меню можно составить под нас?', answer: 'Да. Расскажите о любимых напитках и пожеланиях гостей. Предложим варианты и согласуем состав меню до мероприятия.' },
];

const heroVideoSrc = '/grigoryev-malygin-bar/videos/hero-bar-desktop-v6.mp4';
const heroMobileVideoSrc = '/grigoryev-malygin-bar/videos/hero-bar-mobile-v6.mp4';
const heroMotionSrc = '/grigoryev-malygin-bar/videos/hero-bar-motion-v1.webp';
const heroMobileMotionSrc = '/grigoryev-malygin-bar/videos/hero-bar-motion-mobile-v6.webp';

function HeroFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const requestPlayback = useRef<() => void>(() => {});
  const activateAnimation = useRef<() => void>(() => {});
  const animationError = useRef<() => void>(() => {});
  const animationMode = useRef(false);
  const [animation, setAnimation] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = video.current;
    if (!node) return;
    let inView = true;
    let disposed = false;
    let manuallyPaused = false;
    let attempt = 0;

    const releaseVideo = () => {
      node.pause();
      node.autoplay = false;
      node.preload = 'none';
      node.removeAttribute('src');
      node.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
      node.load();
    };
    const startPlayback = (fromUser = false) => {
      if (fromUser) {
        manuallyPaused = false;
      }
      if (document.hidden || (!fromUser && (!inView || manuallyPaused))) return;

      // Set media properties before assigning the source, including on Safari.
      node.defaultMuted = true;
      node.muted = true;
      node.playsInline = true;
      node.autoplay = true;
      node.preload = 'auto';
      if ((!node.getAttribute('src') && !node.querySelector('source[src]')) || node.error) {
        node.src = window.matchMedia('(max-width: 640px)').matches ? heroMobileVideoSrc : heroVideoSrc;
        node.load();
      }
      const currentAttempt = ++attempt;
      setFailed(false);
      setLoading(true);
      // Keep play() in the click handler's call stack for gesture-only browsers.
      void node.play().catch((error: DOMException) => {
        if (disposed || currentAttempt !== attempt) return;
        setLoading(false);
        setPlaying(false);
        if (error.name === 'AbortError') return;
        activateAnimation.current();
      });
    };
    const syncPlayback = () => {
      if (document.hidden || !inView || manuallyPaused) {
        ++attempt;
        node.pause();
        setPlaying(false);
        setLoading(false);
      } else if (animationMode.current) {
        setPlaying(true);
        setLoading(false);
      } else if (node.paused && !node.error) {
        startPlayback();
      } else if (!node.paused && node.readyState >= 2) {
        setPlaying(true);
        setLoading(false);
      }
    };
    activateAnimation.current = () => {
      if (disposed || animationMode.current) return;
      animationMode.current = true;
      ++attempt;
      releaseVideo();
      setAnimation(true);
      setFailed(false);
      syncPlayback();
    };
    animationError.current = () => {
      animationMode.current = false;
      manuallyPaused = true;
      setAnimation(false);
      setPlaying(false);
      setLoading(false);
      setFailed(true);
    };
    requestPlayback.current = () => {
      if (animationMode.current) {
        manuallyPaused = !manuallyPaused;
        syncPlayback();
      } else if (node.paused) startPlayback(true);
      else {
        manuallyPaused = true;
        ++attempt;
        node.pause();
        setLoading(false);
      }
    };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.05 }) : null;
    observer?.observe(node);
    if (node.error) activateAnimation.current();
    else syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('pageshow', syncPlayback);
    return () => {
      disposed = true;
      requestPlayback.current = () => {};
      activateAnimation.current = () => {};
      animationError.current = () => {};
      animationMode.current = false;
      observer?.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      window.removeEventListener('pageshow', syncPlayback);
      releaseVideo();
    };
  }, []);

  return <div className="hero-media">
    <div className="hero-film" aria-hidden="true">
      <video ref={video} autoPlay muted playsInline loop preload="auto" tabIndex={-1}
        poster="/grigoryev-malygin-bar/images/hero-video-poster.jpg"
        onPlaying={() => { if (animationMode.current) video.current?.pause(); else { setPlaying(true); setLoading(false); setFailed(false); } }}
        onPause={() => { if (!animationMode.current) { setPlaying(false); setLoading(false); } }}
        onError={event => { if (event.target === event.currentTarget) activateAnimation.current(); }}>
        <source media="(max-width: 640px)" src={heroMobileVideoSrc} type="video/mp4"/>
        <source src={heroVideoSrc} type="video/mp4"/>
      </video>
      {animation && playing && <picture>
        <source media="(max-width: 640px)" srcSet={heroMobileMotionSrc} type="image/webp"/>
        <Image unoptimized className="film-animation" src={heroMotionSrc} alt="" width={480} height={854}
          onError={() => animationError.current()}/>
      </picture>}
    </div>
    <Button type="button" variant="ghost" className={playing || loading ? 'film-toggle' : 'film-start'}
      onClick={() => requestPlayback.current()}
      aria-label={playing ? 'Приостановить видео' : failed ? 'Повторить запуск видео' : 'Смотреть видео'}>
      {playing ? <Pause size={15} aria-hidden="true"/> : loading ? <Play size={15} aria-hidden="true"/> : <span className="film-play-icon"><Play size={26} aria-hidden="true"/></span>}
      <span>{playing ? 'Пауза' : loading ? 'Загрузка…' : failed ? 'Повторить' : 'Смотреть видео'}</span>
    </Button>
    {failed && <a className="film-open" href={heroVideoSrc} target="_blank" rel="noopener noreferrer">Открыть видео <ArrowUpRight size={16}/></a>}
  </div>;
}

export default function BarLanding() {
  const root = useRef<HTMLElement>(null);
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [drinkware, setDrinkware] = useState<'glass' | 'disposable'>('glass');

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches || !('IntersectionObserver' in window)) return;
    const nodes = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-reveal]') ?? []);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.visible = 'true';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    nodes.forEach(node => {
      if (node.getBoundingClientRect().top >= window.innerHeight) {
        node.dataset.visible = 'false';
        observer.observe(node);
      }
    });
    const showAll = () => {
      if (media.matches) {
        nodes.forEach(node => { node.dataset.visible = 'true'; });
        observer.disconnect();
      }
    };
    media.addEventListener('change', showAll);
    return () => { observer.disconnect(); media.removeEventListener('change', showAll); };
  }, []);

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const layers = Array.from(container.querySelectorAll<HTMLElement>('[data-depth]'));
    const photos = Array.from(container.querySelectorAll<HTMLElement>("[data-scroll-photo]"));
    const paint = () => {
      frame = 0;
      const gallery = container.querySelector("#cocktail-gallery");
      if (gallery) {
        const bounds = gallery.getBoundingClientRect();
        const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - bounds.top - bounds.height / 2) / innerHeight));
        photos.forEach((photo, i) => {
          const distance = innerWidth < 641 ? 58 : 170;
          photo.style.setProperty("--photo-shift", reduced.matches ? "0px" : `${progress * (i - 1) * distance}px`);
          photo.style.setProperty("--photo-zoom", reduced.matches ? "1" : String(1.04 + Math.abs(progress) * .045));
        });
      }
      for (const layer of layers) {
        const rect = layer.parentElement!.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > innerHeight + 100) continue;
        const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight));
        layer.style.setProperty('--depth-y', reduced.matches ? '0px' : `${progress * Number(layer.dataset.depth)}px`);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    reduced.addEventListener('change', schedule);
    paint();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); reduced.removeEventListener('change', schedule); };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.current?.querySelectorAll('#cocktail-gallery img, .format-preview img').forEach(node => {
      node.animate([{ opacity: .35, transform: 'scale(1.025)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
    });
  }, [drinkware, selectedFormat]);

  return <main ref={root} className="bar-site">
    <a className="skip-link" href="#presentation">К содержанию</a>

    <section className="hero" id="home" aria-labelledby="hero-title">
      <div className="announcement">Выездной бар · Чебоксары</div>
      <SiteHeader/>

      <div className="hero-layout wrap">
        <div className="hero-intro" data-depth="-34">
          <h1 id="hero-title"><span className="hero-line">Ваше событие.</span><span className="hero-line hero-line-script">Наш бар.</span></h1>
        </div>
        <div className="hero-bottom">
          <div>
            <p>Напитки и барная команда<br/>на вашей площадке</p><a href="#formats" className="action-button outline-button hero-action">Выбрать формат <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="hero-stage">
          <div className="hero-video-plane" data-depth="64"><HeroFilm/></div>
          <div className="hero-caption">Вкус. Подача. Атмосфера.</div>
        </div>
      </div>
    </section>

    <section className="presentation wrap section" id="presentation" aria-labelledby="presentation-title">
      <div className="section-top">
        <p className="eyebrow dark-label"><span className="section-number">01</span> МЕНЮ И ПОДАЧА</p>
      </div>
      <div className="gallery-heading" data-reveal>
        <h2 id="presentation-title" className="paired-heading" aria-label="Коктейли и подача"><span className="heading-line">Коктейли</span><span className="section-script">и подача</span></h2>
        <div className="gallery-intro">
          <p>Начинаем с ваших любимых напитков. Подбираем сочетания, посуду и подачу под формат события.</p>
          <a className="action-button outline-button" href="#formats">Выбрать формат</a>
        </div>
      </div>
      <fieldset className="drinkware-options" aria-label="Посуда для подачи">
        <button type="button" aria-pressed={drinkware === 'glass'} aria-controls="cocktail-gallery" onClick={() => setDrinkware('glass')}>В стекле</button>
        <button type="button" aria-pressed={drinkware === 'disposable'} aria-controls="cocktail-gallery" onClick={() => setDrinkware('disposable')}>В одноразовой посуде</button>
      </fieldset>
      <div className="cocktail-gallery" id="cocktail-gallery" aria-label={drinkware === 'glass' ? 'Коктейли в стекле' : 'Коктейли в одноразовой посуде'}>
        <figure className="cocktail-card" data-reveal data-scroll-photo>
          {drinkware === 'glass'
            ? <Image unoptimized src="/grigoryev-malygin-bar/images/coupe-v1.jpg" alt="Светлый коктейль с пеной и цедрой в тонком бокале на ножке" width={1122} height={1402} loading="lazy"/>
            : <Image unoptimized src="/grigoryev-malygin-bar/images/disposable-raspberry-v2.jpg" alt="Розовый ягодный коктейль с пеной, малиновой пудрой и клубничным чипсом в одноразовом стакане" width={1122} height={1402} loading="lazy"/>}
        </figure>
        <figure className="cocktail-card" data-reveal data-scroll-photo>
          {drinkware === 'glass'
            ? <Image unoptimized src="/grigoryev-malygin-bar/images/highball-v1.jpg" alt="Золотистый коктейль со льдом и грейпфрутом в высоком бокале" width={1122} height={1402} loading="lazy"/>
            : <Image unoptimized src="/grigoryev-malygin-bar/images/disposable-cucumber-v2.jpg" alt="Зелёный хайбол со льдом, огуречной лентой и базиликом в высоком одноразовом стакане" width={1122} height={1402} loading="lazy"/>}
        </figure>
        <figure className="cocktail-card" data-reveal data-scroll-photo>
          {drinkware === 'glass'
            ? <Image unoptimized src="/grigoryev-malygin-bar/images/rocks-v1.jpg" alt="Янтарный коктейль с крупным кубом льда и цедрой в низком бокале" width={1122} height={1402} loading="lazy"/>
            : <Image unoptimized src="/grigoryev-malygin-bar/images/disposable-cherry-v2.jpg" alt="Рубиновый коктейль с крупным льдом и вишнями на шпажке в гранёном одноразовом стакане" width={1122} height={1402} loading="lazy"/>}
        </figure>
      </div>
    </section>

    <section className="formats wrap section" id="formats" aria-labelledby="formats-title">
      <div className="section-top">
        <p className="eyebrow dark-label"><span className="section-number">02</span> ФОРМАТЫ</p>
      </div>
      <div className="formats-heading" data-reveal>
        <h2 id="formats-title">У каждого события<br/>свой характер.</h2>
        <p>Четыре варианта коктейльного бара и пять отдельных направлений — от инфьюзов до мастер-классов. Начнём с того, что подходит вашему событию.</p>
      </div>
      <div className="format-studio">
        <figure className="format-preview">
          <Image unoptimized key={services[selectedFormat].id} src={services[selectedFormat].image} alt={services[selectedFormat].imageAlt} width={1122} height={1402} loading="lazy"/>
          <figcaption><span>Коктейльный бар</span><span>{services[selectedFormat].title}</span></figcaption>
        </figure>
        <div className="tariff-list" aria-label="Тарифы коктейльного бара">
          {services.slice(0,4).map((service,index) => <article data-reveal className={`tariff${selectedFormat === index ? ' is-selected' : ''}`} key={service.id}>
            <h3><button type="button" id={`tariff-${service.id}`} aria-expanded={selectedFormat === index} aria-controls={`panel-${service.id}`} onClick={() => setSelectedFormat(index)}>
              <span>{service.title}</span><span className="tariff-symbol" aria-hidden="true">{selectedFormat === index ? '−' : '+'}</span>
            </button></h3>
            <p className="tariff-short">{service.short}</p>
            <div className="tariff-panel" id={`panel-${service.id}`} role="region" aria-labelledby={`tariff-${service.id}`} hidden={selectedFormat !== index}>
              <p>{service.description}</p>
              <ul>{service.offer.map(item => <li key={item.title}>{item.title}</li>)}</ul>
              <div className="tariff-bottom"><span>Индивидуальный расчёт</span><a href={serviceHref(service)} className="editorial-link">Подробнее ↗</a></div>
            </div>
          </article>)}
        </div>
      </div>
      <div className="additional-heading"><h3>Ещё больше способов<br/>собрать гостей.</h3><p>Отдельные направления для вашего события</p></div>
      <nav className="service-links additional-services" aria-label="Дополнительные форматы">
        {services.slice(4).map(service => <a key={service.id} className="service-page-link" data-reveal href={serviceHref(service)}>
          <div className="service-link-copy"><h3>{service.title}</h3><p>{service.description}</p></div><span className="service-link-label">Подробнее ↗</span>
        </a>)}
      </nav>
    </section>

    <section className="team dark" id="team" aria-labelledby="team-title">
      <div className="wrap section">
        <div className="section-top">
          <p className="eyebrow"><span className="section-number">03</span> КОМАНДА</p>
        </div>
        <div className="team-heading" data-reveal>
          <h2 id="team-title">За баром.<br/>И за каждой деталью.</h2>
          <p>Алексей и Роман — партнёры проекта.<br/>У каждого больше десяти лет в барной индустрии.</p>
        </div>
        <div className="founders-grid">
          <article className="founder" data-reveal>
            <div className="founder-photo alex paired-portrait">
              <Image unoptimized src="/grigoryev-malygin-bar/images/team-portraits-alex-tone-v4.jpg" alt="Алексей Григорьев — партнёр проекта" width={1584} height={993} loading="lazy"/>
            </div>
            <div className="founder-title"><h3>Алексей Григорьев</h3><span><strong>10+</strong>лет в индустрии</span></div>
            <p>Алексей соединяет барную идею с точным расчётом. Большой опыт в крупнейших ресторанных холдингах Чувашской Республики помогает ему продумать работу бара целиком — от меню и бюджета до команды на площадке. Ему одинаково важны вкус напитка и то, как организовано всё вокруг.</p>
          </article>
          <article className="founder" data-reveal>
            <div className="founder-photo roman paired-portrait">
              <Image unoptimized src="/grigoryev-malygin-bar/images/team-portraits-diptych-v3.jpg" alt="Роман Малыгин — партнёр проекта" width={1586} height={992} loading="lazy"/>
            </div>
            <div className="founder-title"><h3>Роман Малыгин</h3><span><strong>10+</strong>лет в индустрии</span></div>
            <p>Роман умеет заинтересовать напитком ещё до первого глотка. Он разрабатывал барные карты и работал в крупных ресторанных проектах — за лёгкостью общения у него стоит большой профессиональный опыт, в том числе в обслуживании мероприятий и кейтеринге. С ним легко выбрать напиток под настроение и решиться на новое сочетание.</p>
          </article>
        </div>
      </div>
    </section>

    <section className="how wrap section" id="how" aria-labelledby="how-title">
      <div className="section-top"><p className="eyebrow dark-label"><span className="section-number">04</span> КАК ЗАКАЗАТЬ</p></div>
      <div className="how-grid">
        <div data-reveal><h2 id="how-title">Хороший вечер<br/>начинается<br/>с разговора.</h2><p className="how-intro">Можно прийти с готовым заданием или пока только с датой и идеей.</p></div>
        <div className="how-content">
          <ol className="steps">
            <li data-reveal><span>01</span><div><h3>Расскажите о событии</h3><p>Дата, площадка, число гостей. Любимые напитки и пожелания к бару.</p></div></li>
            <li data-reveal><span>02</span><div><h3>Выберем меню и подачу</h3><p>Согласуем формат, время работы и стоимость. Соберём предложение под ваше мероприятие.</p></div></li>
            <li data-reveal><span>03</span><div><h3>Увидимся на площадке</h3><p>Подготовим бар к согласованному времени и возьмём обслуживание гостей на себя.</p></div></li>
          </ol>
          <Accordion className="faq">
            {faqs.map(faq => <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="faq-trigger" indicator={<span className="accordion-state" aria-hidden="true"><span className="when-closed">Ответ</span><span className="when-open">Скрыть</span></span>}>{faq.question}</AccordionTrigger>
              <AccordionContent className="faq-content">{faq.answer}</AccordionContent>
            </AccordionItem>)}
          </Accordion>
        </div>
      </div>
    </section>

    <ContactSection/>
  </main>;
}
