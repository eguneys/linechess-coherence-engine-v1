import { A, Route, Router, useLocation } from '@solidjs/router'
import './App.scss'
import { createSelector, createSignal, type JSX, lazy, onCleanup, onMount } from 'solid-js'
import { MdTwotoneVerified } from 'solid-icons/md'
import { BiRegularBrain } from 'solid-icons/bi'
import { HiOutlineBars3 } from 'solid-icons/hi'
import { LinechessProvider } from './state/State'

const Main = lazy(() => import('./routes/Main'))
const Evaluator = lazy(() => import('./routes/Evaluator'))

const Layout = (props: { children?: JSX.Element }) => {

  let location = useLocation()
  const is_selected = createSelector(() => location.pathname)

  const [is_navigation_active, set_is_navigation_active] = createSignal(false)

  onMount(() => {

    const on_close_click = (event: MouseEvent) => {
      if (is_navigation_active()) {
        const clickedInsideMenu = false//$navLinks.contains(event.target as HTMLElement);
        const clickedToggleButton = $menuToggle.contains(event.target as HTMLElement);

        if (!clickedInsideMenu && !clickedToggleButton) {
          set_is_navigation_active(false)
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
          RESET-RESET-RESET
        </div>
      </div>
    </header>
    <div class='main-wrap'>
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
