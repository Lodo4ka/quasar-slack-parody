import { LocalStorage } from 'quasar'

type ChangeListener = (newToken: string | null, oldToken: string | null) => void

class AuthManager {
  private currentToken: string | null = this.getToken()
  private onChangeListeners: ChangeListener[] = []

  private storageListener = (evt: StorageEvent) => {
    if (evt.key !== this.storageKey) {
      return
    }

    this.notifyListeners()
  }

  constructor (private storageKey: string) {
    window.addEventListener('storage', this.storageListener)
  }

  private notifyListeners (): void {
    const newToken = this.getToken()

    if (this.currentToken === newToken) {
      return
    }

    this.onChangeListeners.forEach((fn) => fn(newToken, this.currentToken))
    this.currentToken = newToken
  }

  public onChange (listener: ChangeListener): () => void {
    this.onChangeListeners.push(listener)

    // call new listener with current token if we have one
    if (this.currentToken !== null) {
      window.setTimeout(() => listener(this.currentToken, null), 0)
    }

    return () => {
      const idx = this.onChangeListeners.indexOf(listener)

      if (idx >= 0) {
        this.onChangeListeners.splice(idx, 1)
      }
    }
  }

  public onLogout (listener: () => void): () => void {
    return this.onChange((token) => {
      if (token === null) {
        listener()
      }
    })
  }

  public getToken (): string | null {
    return LocalStorage.getItem(this.storageKey)
  }

  public removeToken (): void {
    LocalStorage.remove(this.storageKey)
    this.notifyListeners()
  }

  public logout (): void {
    return this.removeToken()
  }

  public setToken (token: string): void {
    LocalStorage.set(this.storageKey, token)
    this.notifyListeners()
  }
}

export default new AuthManager('auth_token')
