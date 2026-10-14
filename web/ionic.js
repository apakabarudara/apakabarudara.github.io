// Ionic, bundled: only the custom elements this page uses, defined once, plus the base CSS. No CDN, no lazy chunks.
import '@ionic/core/css/core.css';
import '@ionic/core/css/normalize.css';
import '@ionic/core/css/structure.css';
import '@ionic/core/css/typography.css';
import './fonts.css';
import './tokens.css';
import './app.css';
import { initialize } from '@ionic/core/components';
import { defineCustomElement as defineAccordion } from '@ionic/core/components/ion-accordion.js';
import { defineCustomElement as defineAccordionGroup } from '@ionic/core/components/ion-accordion-group.js';
import { defineCustomElement as defineActionSheet } from '@ionic/core/components/ion-action-sheet.js';
import { defineCustomElement as defineApp } from '@ionic/core/components/ion-app.js';
import { defineCustomElement as defineBadge } from '@ionic/core/components/ion-badge.js';
import { defineCustomElement as defineButton } from '@ionic/core/components/ion-button.js';
import { defineCustomElement as defineCard } from '@ionic/core/components/ion-card.js';
import { defineCustomElement as defineContent } from '@ionic/core/components/ion-content.js';
import { defineCustomElement as defineHeader } from '@ionic/core/components/ion-header.js';
import { defineCustomElement as defineItem } from '@ionic/core/components/ion-item.js';
import { defineCustomElement as defineLabel } from '@ionic/core/components/ion-label.js';
import { defineCustomElement as defineList } from '@ionic/core/components/ion-list.js';
import { defineCustomElement as defineModal } from '@ionic/core/components/ion-modal.js';
import { defineCustomElement as defineRefresher } from '@ionic/core/components/ion-refresher.js';
import { defineCustomElement as defineRefresherContent } from '@ionic/core/components/ion-refresher-content.js';
import { defineCustomElement as defineSelect } from '@ionic/core/components/ion-select.js';
import { defineCustomElement as defineSelectOption } from '@ionic/core/components/ion-select-option.js';
import { defineCustomElement as defineToolbar } from '@ionic/core/components/ion-toolbar.js';

// md everywhere: one identity on every phone. Animations follow the reader's motion setting.
initialize({ mode: 'md', animated: !matchMedia('(prefers-reduced-motion: reduce)').matches });

for (const define of [
  defineAccordion, defineAccordionGroup, defineActionSheet, defineApp, defineBadge, defineButton, defineCard, defineContent, defineHeader, defineItem,
  defineLabel, defineList, defineModal, defineRefresher, defineRefresherContent, defineSelect, defineSelectOption, defineToolbar
]) define();
