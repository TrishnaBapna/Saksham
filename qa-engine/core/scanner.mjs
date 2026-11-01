/**
 * Saksham 3.0 Autonomous Quality Assurance Engine
 * Module 1: Application Scanner & DOM Graph Builder
 */

export class ApplicationScanner {
  constructor(browserRunner) {
    this.runner = browserRunner;
  }

  async scan() {
    const scanResult = await this.runner.evaluate(() => {
      const result = {
        title: document.title,
        scriptsLoaded: [],
        stylesheetsLoaded: [],
        tabs: [],
        modals: [],
        rolePortals: [],
        globalServices: {},
        accessibilitySnapshot: {
          missingAltImages: 0,
          modalsWithoutAria: 0,
          interactiveElementsCount: 0
        },
        healthChecks: {
          pixelCharacterAvailable: false,
          followerAvailable: false,
          stateStoreAvailable: false,
          personalisationSettingsAvailable: false,
          dbServiceAvailable: false,
          offlineSyncAvailable: false,
          notesServiceAvailable: false
        }
      };

      // 1. Scripts check
      document.querySelectorAll('script[src]').forEach(s => {
        result.scriptsLoaded.push(s.getAttribute('src'));
      });

      // 2. Tabs check
      const tabButtons = document.querySelectorAll('.nav-tab-btn, button[data-tab]');
      tabButtons.forEach(btn => {
        result.tabs.push({
          id: btn.id,
          tab: btn.dataset.tab || btn.id.replace('tab-', ''),
          label: btn.textContent.trim().replace(/\s+/g, ' '),
          visible: btn.offsetParent !== null
        });
      });

      // 3. Modals check
      const modalElements = document.querySelectorAll('[id^="modal"], [id*="Modal"], [role="dialog"]');
      modalElements.forEach(m => {
        result.modals.push({
          id: m.id,
          role: m.getAttribute('role'),
          ariaModal: m.getAttribute('aria-modal'),
          ariaLabelledBy: m.getAttribute('aria-labelledby'),
          hasCloseButton: !!m.querySelector('button[onclick*="close"], button[aria-label*="Close"], button.close'),
          isHidden: m.classList.contains('hidden') || m.style.display === 'none'
        });
      });

      // 4. Role Portals check
      ['portal-caregiver-container', 'portal-doctor-container', 'portal-admin-container'].forEach(id => {
        const portal = document.getElementById(id);
        result.rolePortals.push({
          id,
          exists: !!portal,
          isHidden: portal ? portal.classList.contains('hidden') : true
        });
      });

      // 5. Global services availability check
      result.healthChecks.pixelCharacterAvailable = typeof window.SakshamPixelCharacter !== 'undefined';
      result.healthChecks.followerAvailable = typeof window.SakshamFollower !== 'undefined';
      result.healthChecks.stateStoreAvailable = typeof window.state !== 'undefined' || typeof window.loadPersistedTasks === 'function';
      result.healthChecks.personalisationSettingsAvailable = typeof window.SakshamPersonalisation !== 'undefined';
      result.healthChecks.dbServiceAvailable = typeof window.dbService !== 'undefined';
      result.healthChecks.offlineSyncAvailable = typeof window.offlineSyncService !== 'undefined';
      result.healthChecks.notesServiceAvailable = typeof window.SakshamNotes !== 'undefined';

      // 6. Accessibility scan
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.hasAttribute('alt') || img.getAttribute('alt') === '') {
          result.accessibilitySnapshot.missingAltImages++;
        }
      });

      result.modals.forEach(m => {
        if (!m.role || !m.ariaModal) {
          result.accessibilitySnapshot.modalsWithoutAria++;
        }
      });

      result.accessibilitySnapshot.interactiveElementsCount = document.querySelectorAll('button, a, input, select, textarea').length;

      return result;
    });

    return scanResult;
  }
}
