import { A, Route, Router, useLocation } from '@solidjs/router'
import './App.scss'
import { createSelector, createSignal, type JSX, lazy, onCleanup, onMount, Show } from 'solid-js'
import { MdRoundAccount_box, MdSharpPower_settings_new, MdTwotoneVerified } from 'solid-icons/md'
import { BiRegularBrain } from 'solid-icons/bi'
import { HiOutlineBars3 } from 'solid-icons/hi'
import { LinechessProvider, useState } from './state/State'

const Main = lazy(() => import('./routes/Main'))
const Evaluator = lazy(() => import('./routes/Evaluator'))

const Layout = (props: { children?: JSX.Element }) => {

  let location = useLocation()
  const is_selected = createSelector(() => location.pathname)

  const [is_navigation_active, set_is_navigation_active] = createSignal(false)
  const [is_dash_active, set_is_dash_active] = createSignal(false)

  onMount(() => {

    const on_close_click = (event: MouseEvent) => {
      if (is_navigation_active() || is_dash_active()) {
        const clickedInsideMenu = false//$navLinks.contains(event.target as HTMLElement);
        const clickedToggleButton = $menuToggle.contains(event.target as HTMLElement);
        const clickedDashButton = $dashToggle.contains(event.target as HTMLElement);

        if (clickedInsideMenu || clickedToggleButton || clickedDashButton) {
        } else {
          set_is_navigation_active(false)
          set_is_dash_active(false)
        }
      }

    }
    // 2. Listen for clicks anywhere on the page
    window.addEventListener('click', on_close_click);

    onCleanup(() => {
      window.removeEventListener('click', on_close_click)
    })
  })


  let $navLinks!: HTMLDivElement
  let $menuToggle!: HTMLDivElement
  let $dashToggle!: HTMLDivElement

  let [{dashboard_state: state}, { dashboard_actions: { login_with_lichess, logout }}] = useState()


  return (<>
    <header>
      <div ref={$menuToggle} class='menu' classList={{active: is_navigation_active() }} onClick={() => set_is_navigation_active(!is_navigation_active())}><HiOutlineBars3/></div>
      <div class='brand'>
        <div class='logo'><BiRegularBrain /></div>
        <div class='title-tag'>
          <div class='title'>
            repertoire coherence hub
            <div class='tag'>
              <MdTwotoneVerified />
              Beta
            </div>
          </div>
          <span>collective performance cohesion engine</span>
        </div>
      </div>
      <nav ref={$navLinks} classList={{active: is_navigation_active() }}>
        <A href="/" classList={{active: is_selected('/')}}>Repertoire Composition</A>
        <A href="/evaluator" classList={{active: is_selected('/evaluator')}}>Community Evaluator</A>
      </nav>
      <div class='long'></div>
      <div class='dash'>
        <div class='status'>
          <div class='label'>Active Curator</div>
          <div class='value'>Synchronized</div>
        </div>
        <div class='profile'>
          <Show when={state.logged_in_profile} fallback={
            <div onClick={login_with_lichess} class='login'>Login with Lichess</div>
          }>{profile => 
            <div ref={$dashToggle} class='username' onClick={() => set_is_dash_active(!is_dash_active())}>{profile().username}</div>
            }</Show>
        </div>
      </div>
      <div classList={{active: is_dash_active()}} class='dash-menu'>
        <div class='link profile'><MdRoundAccount_box/>Profile</div>
        <div onClick={logout} class='link logout'><MdSharpPower_settings_new/> Logout</div>
      </div>
    </header>
    <div class='main-wrapper'>
      {props.children}
    </div>
    <footer></footer>
  </>)
}


function App() {

  return (<>
    <LinechessProvider>
      <Router root={Layout}>
        <Route path='/' component={Main} />
        <Route path='/evaluator' component={Evaluator} />
      </Router>
    </LinechessProvider>
  </>)
}

export default App
