import { WebPlugin } from './index';

import {
  LocalNotificationsPlugin,
  LocalNotificationEnabledResult,
  LocalNotificationPendingList,
  LocalNotificationActionType,
  LocalNotification,
  LocalNotificationScheduleResult
} from '../core-plugin-definitions';

import { PermissionsRequestResult } from '../definitions';

export class LocalNotificationsPluginWeb extends WebPlugin implements LocalNotificationsPlugin {
  private pending: LocalNotification[] = [];

  constructor() {
    super({
      name: 'LocalNotifications',
      platforms: ['web']
    });
  }

  sendPending() {
    const toRemove: LocalNotification[] = [];
    const now = +new Date;
    this.pending.forEach(localNotification => {
      if (localNotification.schedule && localNotification.schedule.at) {
        if (+localNotification.schedule.at <= now) {
          this.buildNotification(localNotification);
          toRemove.push(localNotification);
        }
      }
    });
    console.log('Sent pending, removing', toRemove);

    this.pending = this.pending.filter(localNotification => !toRemove.find(ln => ln === localNotification));
  }

  sendNotification(localNotification: LocalNotification): Notification {
    const l = localNotification;

    if (localNotification.schedule && localNotification.schedule.at) {
      const diff = +localNotification.schedule.at - +new Date;
      this.pending.push(l);
      setTimeout(() => {
        this.sendPending();
      }, diff);
      return;
    }

    this.buildNotification(localNotification);
  }

  buildNotification(localNotification: LocalNotification) {
    const l = localNotification;
    return new Notification(l.title, {
      body: l.body,
      icon: l.icon,
      tag: l.tag,
      silent: l.silent,
      requireInteraction: l.requireInteraction,
    });
  }

  schedule(options: { notifications: LocalNotification[]; }): Promise<LocalNotificationScheduleResult> {
    const notifications: Notification[] = [];
    options.notifications.forEach(notification => {
      notifications.push(this.sendNotification(notification));
    });

    return Promise.resolve({
      notifications: notifications.map(_ => { return { id: '' }})
    });
  }

  getPending(): Promise<LocalNotificationPendingList> {
    return Promise.resolve({
      notifications: this.pending.map(localNotification => {
        return {
          id: '' + localNotification.id
        }
      })
    });
  }

  registerActionTypes(_options: { types: LocalNotificationActionType[]; }): Promise<void> {
    throw new Error("Method not implemented.");
  }

  cancel(pending: LocalNotificationPendingList): Promise<void> {
    console.log('Cancel these', pending);
    this.pending = this.pending.filter(
      localNotification => !pending.notifications.find(ln => ln.id === '' + localNotification.id));
    return Promise.resolve();
  }

  areEnabled(): Promise<LocalNotificationEnabledResult> {
   return window.Notification && Notification.permission === 'granted';
  }

  requestPermissions(): Promise<PermissionsRequestResult> {
    return new Promise((resolve, reject) => {
      if(window.Notification && Notification.permission !== "denied")
        Notification.requestPermission().then((result) => {
          if(result === 'denied' || result === 'default') {
            reject({
              results: [ false ]
            });
            return;
          }
          resolve({
            results: [ true ]
          });
        }).catch((e) => {
          reject(e);
        });
      });
    else
      resolve({
        results: [ false ]
      });
  }
}

const LocalNotifications = new LocalNotificationsPluginWeb();

export { LocalNotifications };
