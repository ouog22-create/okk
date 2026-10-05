import { assetPath as asset } from '../../shared/paths.js';
import { projectCards, projectViewControl } from '../projects.js';
import { clientLogos } from '../clients.js';
import { contactSection } from '../contact-section.js';

function heroSection() {
    return [
        `<section class="hero"><div class="hero-top"><span>INDEPENDENT CREATIVE STUDIO</span><span class="hello-note">A little different.<br>A lot of fun.</span></div>`,
        `<div class="hero-stage"><div class="intro-circle"></div><span class="orbit-note">A NEW POINT OF VIEW ↘</span>`,
        `<div class="mascot-position hero-friends"><div class="hero-friend friend-okk"><button type="button" class="mascot" data-character="okk" aria-label="오키키에게 인사하기"><img class="mascot-image" src="${asset('okk-cutout.png')}" alt="파란 비니를 쓰고 윙크하는 오키키" fetchpriority="high"><span class="mascot-fallback" hidden>OKK<br><small>오키키</small></span></button><span class="hello-bubble">Oh, hello! <span>↗</span></span></div>`,
        `<div class="hero-friend friend-mong"><button type="button" class="mascot" data-character="okkimong" aria-label="오키몽에게 인사하기" aria-expanded="false" aria-controls="mong-greeting"><img class="mascot-image" src="${asset('okkimong-cutout.png')}" alt="파란 비니를 쓰고 윙크하는 오키몽" fetchpriority="high"><span class="mascot-fallback" hidden>HI !<br><small>오키몽</small></span></button><span id="mong-greeting" class="hello-bubble mong-bubble" hidden>HI !</span></div></div><span class="stage-sticker">NICE TO<br>MEET YOU!</span><span class="click-note">click & say hello ⤴</span></div>`,
        `<h1 class="hero-title" aria-label="studio okk">${[...'studio okk'].map((x, i) => x === ' ' ? '<span class="word-space"></span>' : `<span aria-hidden="true" style="--i:${i}">${x}</span>`).join('')}<sup>®</sup></h1>`,
        `<div class="hero-bottom"><p>조금 다른 시선, 꽤 즐거운 결과.<br>우리는 스튜디오 오키키입니다.</p><a href="#selected">SCROLL TO EXPLORE <span>↓</span></a></div></section>`,
    ].join('');
}

function selectedWorks(projects) {
    return [
        `<section class="works-section" id="selected" tabindex="-1"><div class="section-heading"><div><span class="eyebrow">01 / SELECTED WORKS</span><h2>Good work.<br><span>Good energy.</span><i aria-hidden="true"><img class="star-icon" src="${asset('star.svg')}" alt="" width="111" height="111"></i></h2></div>${projectViewControl()}</div>`,
        `<div class="work-grid">${projectCards(projects, true)}</div></section>`,
    ].join('');
}

function clientsSection(clients) {
    return [
        `<section class="clients-section"><div class="section-heading"><div><span class="eyebrow">02 / OUR CLIENTS</span><h2>Better together<span class="blue">.</span></h2></div><p>함께해서 더 좋은 장면들.</p></div>`,
        `<div class="logos">${clientLogos(clients)}</div></section>`,
    ].join('');
}

export function homePage(projects, clients) {
    return [heroSection(), selectedWorks(projects), clientsSection(clients), contactSection()].join('');
}
