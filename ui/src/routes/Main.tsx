import { TbOutlineActivityHeartbeat, TbOutlinePencilMinus } from "solid-icons/tb";
import './Main.scss'
import { BiRegularBookOpen, BiRegularBrain } from "solid-icons/bi";
import { BsPlus, BsTrash} from "solid-icons/bs";
import { HiOutlineSquare3Stack3d } from "solid-icons/hi";
import { createSelector, createSignal, For, onMount, Show } from "solid-js";
import { useState } from "../state/State";
import { AiOutlineClose } from "solid-icons/ai";
import { parse_mainline_from_pgn } from "../state/chess_parser";
import { MdOutlineCommit } from "solid-icons/md";
import { InvalidPGNException } from "../state/db_sync/idb_model";
import { NoPlaylistSelected } from "../state/linechess_state";
import type { LineId } from "../state/types";

export default function Main() {

  const [{ linechess_state: state }, { linechess_actions: { set_open_create_new_line, set_open_create_new_playlist, set_open_create_new_book, select_book, select_playlist, set_open_edit_line, select_line, delete_line, set_open_edit_playlist, set_open_edit_book }}] = useState()

  const is_selected_book = createSelector(() => state.selected_book?.id)
  const is_selected_playlist = createSelector(() => state.selected_playlist?.id)

  const on_edit_line = async (_: LineId) => {
    await select_line(_)
    set_open_edit_line(true)
  }

  return (<>
    <main class='composition'>
        <div class='panel'>
            <div class='title'><TbOutlineActivityHeartbeat />Unified repertoire workspace</div>
            <div class='info'>
                Create opening books, add lines to playlists, and measure their coherence metric to optimize your repertoire. Share them with the community, and rank up the leaderboards.
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
                        <For each={state.books}>{ book =>
                            <div onClick={() => select_book(book.id)} class='book' classList={{ active: is_selected_book(book.id) }}>
                                <div class='title'>{book.name}</div>
                                <span class='nb-playlists'>{book.nb_playlists} Playlists</span>
                                <span class='author'>by {book.author}</span>
                                <div class='actions'>
                                   <button onClick={() => set_open_edit_book(true)} title="Edit"><TbOutlinePencilMinus /></button>
                                </div>
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
                        <For each={state.selected_book?.playlists}>{ item =>
                            <div onClick={() => select_playlist(item.id)} classList={{active: is_selected_playlist(item.id)}} class='playlist'>
                              <div class='info'>
                                <div class='title'>{item.name}</div>
                                <span class='nb-lines'>{item.nb_lines} Lines</span>
                              </div>
                              <div class='long'></div>
                              <div class='actions'>
                                <button onClick={() => set_open_edit_playlist(true)} title="Edit"><TbOutlinePencilMinus /></button>
                              </div>
                            </div>
                        }</For>
                    </div>
                </div>
        </div>
        <div class='lines'>
                <div class='header'>
                    <div class='title'>1. The Ruy Lopez (Spanish Game)</div>
                    <button class='coherence'><BiRegularBrain/>Measure Coherence</button>
                    <button onClick={() => set_open_create_new_line(true)} class='primary'><BsPlus/>Add Line</button>
                </div>
                <div class='content'>
                    <div class='list'>
                        <For each={state.selected_playlist?.lines}>{ (_, i) =>
                            <div class='line'>
                                <div class='title'>
                                  <span class='index'>{i() + 1}</span>{_.name}
                                
                                <div class='long'></div>
                                  <div class='actions'>
                                    <button onClick={() => on_edit_line(_.id)} title="Edit"><TbOutlinePencilMinus/></button>
                                    <button onClick={() => delete_line(_.id) } title="Delete" class='delete'><BsTrash/></button>
                                   </div>
                                </div>
                                <span class='pgn'>
                                    <PgnLine pgn={_.pgn}/>
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

        <Show when={state.is_create_new_line_modal_open}>
            <AddNewLineDialog />
        </Show>

        <Show when={state.is_edit_line_modal_open}>
            <EditLineDialog />
        </Show>
        <Show when={state.is_edit_playlist_modal_open}>
            <EditPlaylistDialog />
        </Show>
        <Show when={state.is_edit_book_modal_open}>
            <EditBookDialog />
        </Show>
    </main>
    </>)
}


function AddNewLineDialog() {

  const [pgn_error, set_pgn_error] = createSignal('')

  const [{ linechess_state: state }, { linechess_actions: { set_open_create_new_line, select_line, create_line, select_playlist, select_book }}] = useState()

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
      if (e instanceof InvalidPGNException) {
        set_pgn_error('Invalid PGN')
      } else if (e instanceof NoPlaylistSelected) {
        set_pgn_error(e.message)
      } else {
        set_pgn_error('Failed creating line.')
      }
    }
  }

  const paste_pgn = () => {
    navigator.clipboard.readText().then(text => {
      $opening_line_pgn_text.value = text
    })
  }

  let $opening_line_name_text!: HTMLInputElement
  let $opening_line_pgn_text!: HTMLInputElement

  let $selected_book!: HTMLSelectElement
  let $selected_playlist!: HTMLSelectElement

  onMount(() => {
    $opening_line_name_text.focus()
  })

  return (<>
    <dialog open={state.is_create_new_line_modal_open}>
      <div onClick={close} class='dialog-backdrop'></div>
      <div class='add-new-line-dialog-content'>
        <div class='panel'>
          <div class='body'>
            <div class='title'><div><MdOutlineCommit/> Add New Line </div><AiOutlineClose onClick={close}/></div>
            <div class='input-group'>
              <label>select book</label>
              <select required={true} onChange={() => select_book($selected_book.value)} ref={$selected_book} value={state.selected_book?.id} name="book_name">
                <For each={state.books}>{ item =>
                  <option value={item.id}>{item.name}</option>
                }</For>
              </select>
            </div>

            <div class='input-group'>
              <label>select playlist</label>
              <select required={true} onChange={() => select_playlist($selected_playlist.value)} ref={$selected_playlist} value={state.selected_playlist?.id} name="playlist_name">
                <For each={state.selected_book?.playlists}>{ item =>
                  <option value={item.id}>{item.name}</option>
                }</For>
              </select>
            </div>

            <div class='input-group'>
               <label for="opening_line_name">Line Name</label>
               <input minLength={3} required={true} ref={$opening_line_name_text} id="opening_line_name" type='text' placeholder="e.g. 3.e5 c5 Advanced Variation"></input>
            </div>

            <div class='input-group'>
               <label for="opening_line_pgn">Line PGN</label>
               <input class='pgn' spellcheck="false" autocorrect="off" aria-invalid={!!pgn_error()} minLength={8} required={true} ref={$opening_line_pgn_text} id="opening_line_pgn" type='text' placeholder="e.g. 1.e4 e5 2. c4 c5 ..." value={state.add_new_line_pgn??''}></input>

              <button onClick={paste_pgn} class='secondary'>Paste PGN</button>
            </div>
            <Show when={pgn_error()}>{error =>
              <div class='error'>{error()}</div>
            }</Show>
          </div>

          <div class='action'>
            <button onClick={close} class='secondary'>Cancel</button>
            <button type="submit" onClick={add_new_opening_line} class='primary'>Add New Line</button>
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
            <div class='title'><div><BiRegularBookOpen/> Add New Book </div><AiOutlineClose onClick={close}/></div>

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


function EditBookDialog() {

  const [{ linechess_state: state },{ linechess_actions: { set_open_edit_book, edit_book, delete_selected_book }}] = useState()

  const close = () => set_open_edit_book(false)


  const on_delete_book = async () => {
    await delete_selected_book()
    close()
  }

  const on_edit_book = async () => {

    if (!$opening_name_text.checkValidity()) {
      $opening_name_text.reportValidity()
      return
    }
    let value = $opening_name_text.value
    try {
      await edit_book(value)
    } catch (e) {
      alert(e)
    }
    close()
  }

  const on_key_press = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      on_edit_book()
    }

  }

  let $opening_name_text!: HTMLInputElement

  onMount(() => {
    $opening_name_text.focus()
  })

  return (<>
    <dialog open={state.is_edit_book_modal_open}>
      <div onClick={close} class='dialog-backdrop'></div>
      <div class='create-new-book-dialog-content'>
        <div class='panel'>
          <div class='body'>
            <div class='title'><div><BiRegularBookOpen/> Edit Book </div><AiOutlineClose onClick={close}/></div>

            <div class='input-group'>
               <label for="opening_name">Edit Book Title</label>
               <input onkeypress={on_key_press} minLength={3} required={true} ref={$opening_name_text} id="opening_name" type='text' placeholder="e.g. 1.e4 Repertoire as White" value={state.selected_book?.name}></input>
            </div>
          </div>
          <div class='action'>
            <button onClick={close} class='secondary'>Cancel</button>
            <button type="submit" onClick={on_edit_book} class='primary'>Edit Book</button>
            <button type="submit" onClick={on_delete_book} class='delete'>Delete Book</button>
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


function EditPlaylistDialog() {

  const [{ linechess_state: state },{ linechess_actions: { set_open_edit_playlist, edit_playlist, delete_selected_playlist }}] = useState()

  const close = () => set_open_edit_playlist(false)

  const on_delete_playlist = async () => {
    await delete_selected_playlist()
    close()
  }

  const on_edit_playlist = async () => {

    if (!$opening_name_text.checkValidity()) {
      $opening_name_text.reportValidity()
      return
    }
    let value = $opening_name_text.value
    try {
      await edit_playlist(value)
    } catch (e) {
      alert(e)
    }
    close()
  }

  const on_key_press = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      on_edit_playlist()
    }

  }

  let $opening_name_text!: HTMLInputElement

  onMount(() => {
    $opening_name_text.focus()
  })

  return (<>
    <dialog open={state.is_edit_playlist_modal_open}>
      <div onClick={close} class='dialog-backdrop'></div>
      <div class='create-new-playlist-dialog-content'>
        <div class='panel'>
          <div class='body'>
            <div class='title'><div><HiOutlineSquare3Stack3d/> Edit Playlist </div><AiOutlineClose onClick={close}/></div>

            <div class='input-group'>
               <label for="opening_name">Edit Playlist Name</label>
               <input onkeypress={on_key_press} minLength={3} required={true} ref={$opening_name_text} id="opening_name" type='text' placeholder="e.g. Najdorf Poisoned Pawns" value={state.selected_playlist?.name}></input>
            </div>
          </div>
          <div class='action'>
            <button onClick={close} class='secondary'>Cancel</button>
            <button type="submit" onClick={on_edit_playlist} class='primary'>Edit Playlist</button>
            <button type="submit" onClick={on_delete_playlist} class='delete'>Delete Playlist</button>
          </div>
        </div>
      </div>
    </dialog>
  </>)
}


function EditLineDialog() {

  const [pgn_error, set_pgn_error] = createSignal('')

  const [{ linechess_state: state }, { linechess_actions: { set_open_edit_line, edit_line }}] = useState()

  const close = () => set_open_edit_line(false)

  const on_edit_line = async () => {

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
      await edit_line(value, pgn_value)
      close()
    } catch (e) {
      if (e instanceof InvalidPGNException) {
        set_pgn_error('Invalid PGN')
      } else {
        set_pgn_error('Failed editing line.')
      }
    }
  }

  const paste_pgn = () => {
    navigator.clipboard.readText().then(text => {
      $opening_line_pgn_text.value = text
    })
  }

  let $opening_line_name_text!: HTMLInputElement
  let $opening_line_pgn_text!: HTMLInputElement

  onMount(() => {
    $opening_line_name_text.focus()
  })

  return (<>
    <dialog open={state.is_edit_line_modal_open}>
      <div onClick={close} class='dialog-backdrop'></div>
      <div class='add-new-line-dialog-content'>
        <div class='panel'>
          <div class='body'>
            <div class='title'><div><MdOutlineCommit/> Edit Line </div><AiOutlineClose onClick={close}/></div>

            <div class='input-group'>
               <label for="opening_line_name">Edit Line Name</label>
               <input minLength={3} required={true} ref={$opening_line_name_text} id="opening_line_name" type='text' placeholder="e.g. 3.e5 c5 Advanced Variation" value={state.selected_line?.name}></input>
            </div>

            <div class='input-group'>
               <label for="opening_line_pgn">Edit Line PGN</label>
               <input class='pgn' spellcheck="false" autocorrect="off" aria-invalid={!!pgn_error()} minLength={8} required={true} ref={$opening_line_pgn_text} id="opening_line_pgn" type='text' placeholder="e.g. 1.e4 e5 2. c4 c5 ..." value={state.selected_line?.pgn}></input>

              <button onClick={paste_pgn} class='secondary'>Paste PGN</button>
            </div>
            <Show when={pgn_error()}>{error =>
              <div class='error'>{error()}</div>
            }</Show>
          </div>

          <div class='action'>
            <button onClick={close} class='secondary'>Cancel</button>
            <button type="submit" onClick={on_edit_line} class='primary'>Edit Line</button>
          </div>
        </div>
      </div>
    </dialog>
  </>)
}




function PgnLine(props: { pgn: string }) {

  let moves = parse_mainline_from_pgn(props.pgn).map(_ => _.san)

  return (<>
    <div class='moves'>
      <For each={moves}>{item =>
        <div class='move'>{item}</div>
      }</For>
    </div>
  </>)
}