Téma: Agentovo orientované masívne paralelné prostredie pre modelovanie na SŠ

Meno: Ivana Zeleňáková

Vedúci práce: prof. RNDr. Ivan Kalaš, PhD.

Anotácia: Modelovanie prírodných a spoločenských javov hrá od 80-tych rokov až dodnes dôležitú úlohu v stredoškolskej informatike v mnohých západných krajinách. V českom a slovenskom vzdelávacom kontexte (na úrovni SŠ) si však nikdy nevyslúžilo zodpovedajúcu pozornosť, ani záujem výskumu v oblasti vyučovania informatiky. Táto práca sa preto zameria na oblasť školského modelovania pomocou agentovo orientovaného softvérového prostredia, v ktorom žiaci skúmajú javy typu dopravná situácia na diaľnici, život okolo mraveniska alebo dynamiku piesočných dún. Definujú k tomu jednoduché pravidlá správania a závislostí elementárneho prvku a pozorujú vývoj systému s tisícmi takýchto prvkov v čase, vznikajúce emergentné javy a pod.

Cieľ: Cieľom práce bude charakterizovať agentovo orientované modelovanie vo vzdelávacom kontexte, preskúmať niektoré jestvujúce prostredia a podobné prostredie s podporou masívnych paralelných procesov aj experimentálne implementovať. Ďalej navrhnúť z dôvodov overenia tohto prostredia vzdelávací obsah na 2 alebo 3 vyučovacie hodiny na SŠ a realizovať ich v reálnej školskej situácii. Zhodnotiť priebeh hodín, prácu žiakov, správanie svojho softvérového prostredia a vhodnosť pripraveného obsahu. Analyzovať, ako prípadne ďalej prostredie upraviť alebo rozšíriť.


Plán práce

Hotové
-	vytvoriť vývojové prostredie vo Vite + TypeScript
-	implementovať vykresľovanie simulácie pomocou PixiJS
-	presunúť výpočty simulácie do Web Workera
-	zabezpečiť komunikáciu medzi workerom a vykresľovaním
-	implementovať ECS architektúru pomocou bitECS
-	implementovať zdieľanú pamäť pomocou SharedArrayBuffer

Najbližšie kroky
-	navrhnúť jazyk pre definovanie správania agentov
-	implementovať editor pravidiel agentov
-	implementovať parser navrhnutého jazyka

Ďalší plán
-	navrhnúť používateľské rozhranie
-	implementovať používateľské rozhranie pomocou Tweakpane
-	písanie diplomovej práce
-	vytvoriť viacero ukážkových ABM modelov
-	implementovať podporu viacerých workerov
-	implementovať synchronizáciu pomocou Atomics API
-	implementovať ukladanie a načítanie projektov
-	testovať aplikáciu
-	navrhnúť 2-3 vyučovacie hodiny
-	overiť v praxi na škole
