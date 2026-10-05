import { assetPath as asset } from '../../shared/paths.js';
import { charactersSection } from '../characters.js';
import { contactSection } from '../contact-section.js';

export function aboutPage() {
    return `<section class="page-section about"><div class="page-intro"><span class="eyebrow">HELLO, WE ARE STUDIO OKK</span><h1>A little different.<br><em>A lot of fun.</em></h1><p>조금 다른 시선으로, 함께 만드는 즐거운 가능성.</p></div><figure class="friends-image"><img src="${asset('okk-friends.jpg')}" alt="푸른 꿈을 함께하는 오키키와 오키몽" width="1080" height="1351"></figure><div class="about-copy"><h2>Meet studio okk<span class="blue">.</span></h2><div><p>캐릭터 디자인 스튜디오 오키키는 Creative, Attractive, Sensitive를 중심으로<br>눈길을 사로잡는 캐릭터와 완성도 높은 퀄리티의 디자인을 구현합니다.<br>톡톡 튀는 색감과 다채로운 표정으로 보는이의 마음을 사로잡아요!</p><a class="pill"href="https://drive.google.com/file/d/1QrIeum6vCQd1eXmuTfKln-wYvije-6oX/view?usp=drive_link"target="_blank"rel="noopener noreferrer">회사소개서 보기 ↗</a></div></div>${charactersSection()}</section>${contactSection()}`;
}
