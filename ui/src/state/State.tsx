import { createContext, type JSX, useContext } from "solid-js"
import { make_linechess_store, type Actions, type State } from "./linechess_state"
import { make_dashboard, type DashboardActions, type DashboardState } from "./dashboard_state"

export const useState = () => useContext(LinechessContext)!

const LinechessContext = createContext<LinechessStore>()

type LinechessState = {
    linechess_state: State
    dashboard_state: DashboardState
}

type LinechessActions = {
    linechess_actions: Actions
    dashboard_actions: DashboardActions
}

export type LinechessStore = [LinechessState, LinechessActions]



export const LinechessProvider = (props: { children: JSX.Element }) => {

    const [dashboard_state, dashboard_actions] = make_dashboard()
    const [linechess_state, linechess_actions] = make_linechess_store()

    const state = {
        linechess_state,
        dashboard_state,
    }

    const actions = {
        linechess_actions,
        dashboard_actions,
    }

    const store: LinechessStore = [state, actions]

    return <LinechessContext.Provider value={store}>
        {props.children}
    </LinechessContext.Provider>
}