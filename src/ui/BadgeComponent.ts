/**
 * Live Train Delay Badge Component
 * Interactive [Check Live ↻] pill button with reactive state machine
 * Created by Rajdip Ghosh (https://github.com/RajdipGhosh99).
 */

import { InjectedWidget } from '../core/types';
import { formatDelayShort } from '../core/utils';
import { refreshIcon } from './icons';

export class BadgeComponent {
  public static createBadgeWrapper(trainNumber: string, travelDate?: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'rail-delay-wrapper position-beside-name';
    wrapper.setAttribute('data-train-number', trainNumber);
    if (travelDate) {
      wrapper.setAttribute('data-travel-date', travelDate);
    }
    return wrapper;
  }

  public static createBadgeButton(trainNumber: string): HTMLElement {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'rail-delay-badge state-idle';
    badge.setAttribute('data-train-number', trainNumber);
    badge.setAttribute('aria-label', `Check live running delay for train ${trainNumber}`);
    badge.innerHTML = `
      <span class="rail-badge-text">Check Live</span>
      <span class="rail-badge-reload-icon" title="Fetch live running delay">${refreshIcon({ size: 11 })}</span>
    `;
    return badge;
  }

  public static updateState(
    widget: InjectedWidget,
    state: 'idle' | 'loading' | 'on-time' | 'delayed' | 'error' | 'no-key',
    delayMinutes = 0
  ): void {
    widget.state = state;
    const badge = widget.badge;

    // Reset state classes
    badge.classList.remove(
      'state-idle',
      'state-loading',
      'state-on-time',
      'state-delayed',
      'state-error',
      'state-no-key'
    );
    badge.classList.add(`state-${state}`);

    if (state === 'loading') {
      badge.innerHTML = `
        <span class="rail-delay-spinner" aria-hidden="true"></span>
        <span class="rail-badge-text">Checking…</span>
      `;
    } else if (state === 'on-time') {
      badge.innerHTML = `
        <span class="rail-status-dot on-time"></span>
        <span class="rail-badge-text">On Time</span>
        <span class="rail-badge-reload-icon" title="Refresh live status">${refreshIcon({ size: 10 })}</span>
      `;
    } else if (state === 'delayed') {
      const formattedDelay = formatDelayShort(delayMinutes);
      badge.innerHTML = `
        <span class="rail-status-dot delayed"></span>
        <span class="rail-badge-text">${formattedDelay}</span>
        <span class="rail-badge-reload-icon" title="Refresh live status">${refreshIcon({ size: 10 })}</span>
      `;
    } else if (state === 'error') {
      badge.innerHTML = `
        <span class="rail-status-dot error"></span>
        <span class="rail-badge-text">Retry</span>
        <span class="rail-badge-reload-icon" title="Retry live status">${refreshIcon({ size: 10 })}</span>
      `;
    } else if (state === 'no-key') {
      badge.innerHTML = `
        <span class="rail-badge-text">Set Key</span>
      `;
    } else {
      // Idle
      badge.innerHTML = `
        <span class="rail-badge-text">Check Live</span>
        <span class="rail-badge-reload-icon" title="Fetch live running delay">${refreshIcon({ size: 11 })}</span>
      `;
    }
  }
}
