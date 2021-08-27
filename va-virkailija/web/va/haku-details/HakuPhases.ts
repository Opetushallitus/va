export default class HakuPhases {
  static allStatuses() {
    return ['upcoming', 'current', 'ended', 'unpublished']
  }

  static statusToFI(status: string): string {
    const translations = {
      "upcoming": "Aukeamassa",
      "current": "Auki",
      "ended": "Päättynyt",
      "unpublished": "Kiinni"
    }
    return translations[status] ? translations[status] : status
  }
}
