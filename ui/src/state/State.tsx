import { createContext, type JSX, useContext } from "solid-js"
import { make_linechess_store, type Actions, type State } from "./linechess_state"
import { make_dashboard, type DashboardActions, type DashboardState } from "./dashboard_state"
import { make_evaluate_store, type EvaluateActions, type EvaluateState } from "./evaluate_state"

export const useState = () => useContext(LinechessContext)!

const LinechessContext = createContext<LinechessStore>()

type LinechessState = {
    linechess_state: State
    dashboard_state: DashboardState
    evaluate_state: EvaluateState
}

type LinechessActions = {
    linechess_actions: Actions
    dashboard_actions: DashboardActions
    evaluate_actions: EvaluateActions
}

export type LinechessStore = [LinechessState, LinechessActions]



export const LinechessProvider = (props: { children: JSX.Element }) => {

    const [dashboard_state, dashboard_actions] = make_dashboard()
    const [linechess_state, linechess_actions] = make_linechess_store(dashboard_state)
    const [evaluate_state, evaluate_actions] = make_evaluate_store(dashboard_state)

    const state = {
        linechess_state,
        dashboard_state,
        evaluate_state
    }

    const actions = {
        linechess_actions,
        dashboard_actions,
        evaluate_actions
    }

    const store: LinechessStore = [state, actions]

    return <LinechessContext.Provider value={store}>
        {props.children}
    </LinechessContext.Provider>
}