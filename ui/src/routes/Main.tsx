import { TbOutlineActivityHeartbeat, TbOutlinePencilMinus } from "solid-icons/tb";
import './Main.scss'
import { BiRegularBookOpen, BiRegularBrain } from "solid-icons/bi";
import { BsPlus, BsTrash} from "solid-icons/bs";
import { HiOutlineSquare3Stack3d } from "solid-icons/hi";
import { createSignal, For, onMount, Show } from "solid-js";
import { useState } from "../state/State";
import { AiOutlineClose } from "solid-icons/ai";

const list = 'abc,'.repeat(30).split(',')

export default function Main() {

  const [{ linechess_state: state }, { linechess_actions: { set_open_create_new_playlist, set_open_create_new_book }}] = useState()

    return (<>
    <main class='composition'>
        <div class='panel'>
            <div class='title'><TbOutlineActivityHeartbeat />Unified repertoire workspace</div>
            <div class='info'>
                Create opening books, add lines to playlists, and measure their coherence metric to optimize your repertoire. Share them with the community, rank up the leaderboards.
            </div>
        </div>
        <div class='books'>
                <div class='header'>
                    <BiRegularBookOpen />
                    <div class='title'>Active Books</div>
                    <button onClick={() => set_open_create_new_book(true)} class='secondary'><BsPlus/>Book</button>
                </div>
                <div class='content'>
                    <div class='list'>
                        <For each={list}>{ () =>
                            <div class='book'>
                                <div class='title'>Theoretical Masterclass: Grandmaster Repertoire Advanced Masterclass</div>
                                <span class='nb-playlists'>10 Playlists</span>
                            </div>
                        }</For>
                    </div>
                </div>
        </div>
        <div class='playlists'>
                <div class='header'>
                    <HiOutlineSquare3Stack3d/>
                    <div class='title'>Playlists</div>
                    <button onClick={() => set_open_create_new_playlist(true)} class='secondary purple'><BsPlus/>Playlist</button>
                </div>
                <div class='content'>
                    <div class='list'>
                        <For each={list}>{ () =>
                            <div class='playlist'>
                                <div class='title'>1. The Ruy Lopez (Spanish Game) </div>
                                <span class='nb-lines'>10 Lines</span>
                            </div>
                        }</For>
                    </div>
                </div>
        </div>
        <div class='lines'>
                <div class='header'>
                    <div class='title'>1. The Ruy Lopez (Spanish Game)</div>
                    <button class='coherence'><BiRegularBrain/>Measure Coherence</button>
                    <button class='primary'><BsPlus/>Add Line</button>
                </div>
                <div class='content'>
                    <div class='list'>
                        <For each={list}>{ (_, i) =>
                            <div class='line'>
                                <div class='title'><span class='index'>{i() + 1}</span> Berlin Defence: L'Hermet Variation</div>
                                <span class='pgn'>
                                    <PgnLine/>
                                    <button title="Edit"><TbOutlinePencilMinus/></button>
                                    <button title="Delete" class='delete'><BsTrash/></button>
                                </span>
                            </div>
                        }</For>
                    </div>
                </div>
        </div>

        <Show when={state.is_create_new_playlist_modal_open}>
            <CreateNewPlaylistDialog />
        </Show>

        <Show when={state.is_create_new_book_modal_open}>
            <CreateNewBookDialog />
        </Show>
        <img alt="" src="/screen1.png"/>
    </main>
    </>)
}


function AddNewLineOpeningDialog() {

  const [pgn_error, set_pgn_error] = createSignal('')

  const [{ linechess_state: state }, { linechess_actions: { set_open_create_new_line, select_line, create_line, select_playlist }}] = useState()

  const close = () => set_open_create_new_line(false)

  const add_new_opening_line = async () => {

    if (!$opening_line_name_text.checkValidity()) {
      $opening_line_name_text.reportValidity()
      return
    }
    let value = $opening_line_name_text.value

    if (!$opening_line_pgn_text.checkValidity()) {
      $opening_line_pgn_text.reportValidity()
      return
    }
    let pgn_value = $opening_line_pgn_text.value


    try {
      set_pgn_error('')
      let id = await create_line(value, pgn_value)
      if (id !== undefined) {
        select_line(id)
      }
      close()
    } catch (e) {
      set_pgn_error('Invalid PGN')
    }
  }

  const paste_pgn = () => {
    navigator.clipboard.readText().then(text => {
      $opening_line_pgn_text.value = text
    })
  }

  let $opening_line_name_text!: HTMLInputElement
  let $opening_line_pgn_text!: HTMLInputElement

  let $selected_opening_list!: HTMLSelectElement

  onMount(() => {
    $opening_line_name_text.focus()
  })

  return (<>
    <dialog open={state.is_create_new_line_modal_open}>
      <div onClick={close} class='dialog-backdrop'></div>
      <div class='create-new-opening-dialog-content'>
        <div class='panel'>
          <div class='body'>
            <div class='title'>Add New Opening Line</div>
            <div class='input-group'>
              <label>to list</label>
              <select onChange={() => select_playlist($selected_opening_list.value)} ref={$selected_opening_list} value={state.selected_playlist?.id} name="list_name">
                <For each={state.playlists}>{ item =>
                  <option value={item.id}>{item.name}</option>
                }</For>
              </select>
            </div>

            <div class='input-group'>
               <label for="opening_line_name">Opening Line Name</label>
               <input minLength={3} required={true} ref={$opening_line_name_text} id="opening_line_name" type='text' placeholder="e.g. 3.e5 c5 Advanced Variation"></input>
            </div>

            <div class='input-group'>
               <label for="opening_line_pgn">Opening Line PGN</label>
               <input spellcheck="false" autocorrect="off" aria-invalid={!!pgn_error()} minLength={8} required={true} ref={$opening_line_pgn_text} id="opening_line_pgn" type='text' placeholder="e.g.1.e4 e5 2. c4 c5 ..." value={state.add_new_line_pgn}></input>
               <Show when={pgn_error()}>{error =>
                <div class='error'>{error()}</div>
              }</Show>
              <button onClick={paste_pgn} class='secondary'>Paste PGN</button>
            </div>
          </div>
          <div class='action'>
            <button type="submit" onClick={add_new_opening_line} class='primary'>Add New Line</button>
            <button onClick={close} class='secondary'>Cancel</button>
          </div>
        </div>
      </div>
    </dialog>
  </>)
}


function CreateNewBookDialog() {

  const [{ linechess_state: state },{ linechess_actions: { set_open_create_new_book, create_book, select_book }}] = useState()

  const close = () => set_open_create_new_book(false)

  const save_book = async () => {

    if (!$opening_name_text.checkValidity()) {
      $opening_name_text.reportValidity()
      return
    }
    let value = $opening_name_text.value
    try {
      let id = await create_book(value)
      if (id !== undefined) {
        select_book(id)
      }
    } catch (e) {

      alert(e)
    }
    close()
  }

  const on_key_press = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      save_book()
    }

  }

  let $opening_name_text!: HTMLInputElement

  onMount(() => {
    $opening_name_text.focus()
  })

  return (<>
    <dialog open={state.is_create_new_book_modal_open}>
      <div onClick={close} class='dialog-backdrop'></div>
      <div class='create-new-book-dialog-content'>
        <div class='panel'>
          <div class='body'>
            <div class='title'><div><HiOutlineSquare3Stack3d/> Add New Book </div><AiOutlineClose onClick={close}/></div>

            <div class='input-group'>
               <label for="opening_name">Book Title *</label>
               <input onkeypress={on_key_press} minLength={3} required={true} ref={$opening_name_text} id="opening_name" type='text' placeholder="e.g. 1.e4 Repertoire as White"></input>
            </div>
          </div>
          <div class='action'>
            <button onClick={close} class='secondary'>Cancel</button>
            <button type="submit" onClick={save_book} class='primary'>Save Book</button>
          </div>
        </div>
      </div>
    </dialog>
  </>)
}



function CreateNewPlaylistDialog() {

  const [{ linechess_state: state },{ linechess_actions: { set_open_create_new_playlist, create_playlist, select_playlist }}] = useState()

  const close = () => set_open_create_new_playlist(false)

  const save_playlist = async () => {

    if (!$opening_name_text.checkValidity()) {
      $opening_name_text.reportValidity()
      return
    }
    let value = $opening_name_text.value
    try {
      let id = await create_playlist(value)
      if (id !== undefined) {
        select_playlist(id)
      }
    } catch (e) {

      alert(e)
    }
    close()
  }

  const on_key_press = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      save_playlist()
    }

  }

  let $opening_name_text!: HTMLInputElement

  onMount(() => {
    $opening_name_text.focus()
  })

  return (<>
    <dialog open={state.is_create_new_playlist_modal_open}>
      <div onClick={close} class='dialog-backdrop'></div>
      <div class='create-new-playlist-dialog-content'>
        <div class='panel'>
          <div class='body'>
            <div class='title'><div><HiOutlineSquare3Stack3d/> Add New Playlist </div><AiOutlineClose onClick={close}/></div>

            <div class='input-group'>
               <label for="opening_name">Playlist Name *</label>
               <input onkeypress={on_key_press} minLength={3} required={true} ref={$opening_name_text} id="opening_name" type='text' placeholder="e.g. Najdorf Poisoned Pawns"></input>
            </div>
          </div>
          <div class='action'>
            <button onClick={close} class='secondary'>Cancel</button>
            <button type="submit" onClick={save_playlist} class='primary'>Save Playlist</button>
          </div>
        </div>
      </div>
    </dialog>
  </>)
}



function PgnLine() {

    return (<>
    <div class='moves'>
        <For each={list}>{ item => 
            <div class='move'>{item}</div>
        }</For>
    </div>
    </>)
}