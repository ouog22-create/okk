import { assetPath as asset } from '../../shared/paths.js';
import { charactersSection } from '../characters.js';
import { contactSection } from '../contact-section.js';

export function aboutPage() {
    return `<section class="page-section about"><div class="page-intro"><span class="eyebrow">HELLO, WE ARE STUDIO OKK</span><h1>A little different.<br><em>A lot of fun.</em></h1><p>조금 다른 시선으로, 함께 만드는 즐거운 가능성.</p><span class="draft-note">소개 문구 초안 · 최종 스튜디오 소개는 준비 중입니다.</span></div><figure class="friends-image"><img src="${asset('okk-friends.jpg')}" alt="푸른 꿈을 함께하는 오키키와 오키몽" width="1080" height="1351"></figure><div class="about-copy"><h2>Meet studio okk<span class="blue">.</span></h2><div><p>스튜디오의 이야기, 제공 서비스와 작업 방식을 소개할 공간입니다.</p><p class="muted">최종 소개 문구와 이미지가 준비되면 이곳에 반영됩니다.</p><button class="pill" data-contact>함께 이야기하기 ↗</button></div></div>${charactersSection()}</section>${contactSection()}`;
}
