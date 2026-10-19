import { AuthPanel } from '@/components/auth-panel'
import { version } from '../package.json'

export default function App() {
  return <main className="login-page">
    <header><span className="eyebrow">A little focus. A little care.</span><h1>Focuswilds</h1></header>
    <img className="login-cat" src={`${import.meta.env.BASE_URL}cat.png`} width="128" height="128" alt="A little black cat waiting to come home"/>
    <div className="login-intro"><h2>Make room for a little friend.</h2><p>Focus on your day.<br/>Find cats in the garden.<br/>Give them a place to call home.</p></div>
    <AuthPanel/>
    <footer>Just you, a quiet garden, and your cats.<span>v{version}</span></footer>
  </main>
}
