// ეს ფაილი სერვერიდან ჩაიტვირთება Extension-ის მიერ
// განახლებისთვის მხოლოდ სერვერზე შეცვალე — Extension-ის ხელახლა დაყენება არ სჭირდება!

const API_INSTANCE = 'https://my-extension-production-55ba.up.railway.app/'
const FRONT_URL = API_INSTANCE + 'panel/'

//=========================================================================================> AUTH
let IS_AUTH = false

setTimeout(async () => {
  let currentUrl = document.URL
  if (currentUrl.includes('home.ss.ge')) await check_auth_ss()
  if (currentUrl.includes('myhome.ge')) await check_auth_myhome()
}, 500)

async function check_auth_ss() {
  const token_local = get_token_from_local_storage()
  if (!token_local) { return }
  let auth_data = null
  try {
    auth_data = await api_refresh_token(token_local)
  } catch(e) {
    console.warn("MyEstate: სერვერთან კავშირი ვერ მოხდა")
    return
  }
  if (!auth_data || auth_data.message) {
    await verification_from_ss(true)
    return
  }
  set_user_to_local_storage(auth_data.user)
  set_token_to_local_storage(auth_data.accessToken)
  IS_AUTH = true
}

async function check_auth_myhome() {
  const url_params = new URLSearchParams(window.location.search)
  const token_url = url_params.get('SH-token')
  const token_local = get_token_from_local_storage()
  let auth_data = null
  if (token_url) auth_data = await api_refresh_token(token_url)
  if (!token_url && token_local) auth_data = await api_refresh_token(token_local)
  if (!auth_data) return
  if (auth_data.message) {
    set_user_to_local_storage(null)
    set_token_to_local_storage(null)
    alert(auth_data.message)
    return
  }
  if (auth_data) {
    set_user_to_local_storage(auth_data.user)
    set_token_to_local_storage(auth_data.accessToken)
    IS_AUTH = true
  }
  if (token_url) {
    window.location = 'https://www.myhome.ge'
  }
}

async function verification_from_ss(loading) {
  const element = document.getElementById('__NEXT_DATA__')
  if (!element) return
  const obj = JSON.parse(element.textContent)
  const session = obj.props.pageProps.session?.user
  if (!session) { alert('არ ხართ ავტორიზირებული ss.ge-ზე'); return }
  const data = {
    ss_name: session.name,
    ss_sub: session.sub,
    ss_phone: Number(session.phone_number),
    ss_pin: session.PIN
  }
  let res
  try {
    res = await api_broker_login_pin(data)
    if (res.message) res = await api_broker_registration(data)
  } catch(e) {
    // სერვერთან კავშირი ვერ მოხდა — extension-ი ჩართული რჩება, ჩუმად ვცდით
    console.warn('MyEstate: სერვერთან კავშირი ვერ მოხდა, ხელახლა ვცდი...')
    return
  }
  if (!res || res.message) {
    // სერვერი პასუხობს მაგრამ შეცდომა აქვს — მხოლოდ console-ში ვწერთ, არ ვხვრეტთ UI-ს
    console.warn('MyEstate auth error:', res?.message)
    return
  }
  set_user_to_local_storage(res.user)
  set_token_to_local_storage(res.accessToken)
  IS_AUTH = true
  if (loading) {
    setTimeout(() => { insers_base_modal() }, 1500)
  } else {
    insers_base_modal()
  }
}

// ==== LOCAL STORAGE
function set_user_to_local_storage(user) {
  if (user == null) localStorage.removeItem('myestate_user')
  else localStorage.setItem('myestate_user', JSON.stringify(user))
}
function set_token_to_local_storage(token) {
  if (token == null) localStorage.removeItem('myestate_token')
  else localStorage.setItem('myestate_token', token)
}
function get_user_from_local_storage() {
  return JSON.parse(localStorage.getItem('myestate_user'))
}
function get_token_from_local_storage() {
  return localStorage.getItem('myestate_token')
}

// ==== API
async function api_broker_registration(data) {
  const response = await fetch(`${API_INSTANCE}auth/broker_registration`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
  })
  const json = await response.json()
  if (!response.ok) return { message: json.message }
  return json
}
async function api_broker_login_pin(data) {
  const response = await fetch(`${API_INSTANCE}auth/broker_login_pin`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
  })
  const json = await response.json()
  if (!response.ok) return { message: json.message }
  return json
}
async function api_refresh_token(token) {
  const response = await fetch(API_INSTANCE + 'auth/login/access-token', {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": 'Bearer ' + token, "refreshToken": token }
  })
  return await response.json()
}

//=========================================================================================> UI

// FIX: setInterval-ის ნაცვლად MutationObserver — არ იწვევს memory leak-ს
// და UI-ს მხოლოდ მაშინ ამოწმებს, როდესაც DOM-ი იცვლება
let _uiObserver = null
let _lastUrl = ''

function start_ui_observer() {
  const currentUrl = document.URL
  if (currentUrl.includes('https://home.ss.ge/')) append_UI({ ss: true, myhome: false })
  if (currentUrl.includes('https://www.myhome.ge/')) append_UI({ ss: false, myhome: true })

  if (_uiObserver) return
  _uiObserver = new MutationObserver(() => {
    const url = document.URL
    if (url === _lastUrl) return
    _lastUrl = url
    if (url.includes('https://home.ss.ge/')) append_UI({ ss: true, myhome: false })
    if (url.includes('https://www.myhome.ge/')) append_UI({ ss: false, myhome: true })
  })
  _uiObserver.observe(document.body, { childList: true, subtree: true })
}

// DOM მზად იყოს შემდეგ გავუშვათ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start_ui_observer)
} else {
  start_ui_observer()
}

function get_inner_container_HTML() {
  const item = document.createElement('div')
  item.className = 'inner_container'
  item.id = 'inner_container'
  return item
}
function get_buttons_container_HTML() {
  const item = document.createElement('div')
  item.className = 'buttons_container'
  item.id = 'buttons_container'
  return item
}
function get_base_btn_HTML() {
  const item = document.createElement('div')
  item.id = 'open_base_btn'
  item.title = 'დრაფტების სია'
  item.style.cssText = 'width:34px;height:34px;margin:5px;cursor:pointer;background:#9c27b0;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;'
  item.textContent = '📋'
  return item
}
function get_save_btn_HTML(id, title, emoji) {
  const item = document.createElement('div')
  item.id = id
  item.title = title
  item.style.cssText = 'width:34px;height:34px;margin:5px;cursor:pointer;background:#2196F3;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;'
  item.textContent = emoji
  return item
}
function get_loading_gif_HTML() {
  const item = document.createElement('div')
  item.id = 'loading_gif'
  item.style.cssText = 'width:34px;height:34px;margin:5px;display:none;align-items:center;justify-content:center;'
  item.innerHTML = '<div style="width:20px;height:20px;border:3px solid #9c27b0;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>'
  return item
}
function get_loading_images_HTML() {
  const item = document.createElement('div')
  item.id = 'loading_images'
  item.className = 'progress-box'
  item.style.display = 'none'
  item.innerHTML = '<div class="progress-custom"><div class="progress-bar" style="width:0%" id="loading_images_progress"></div></div>'
  return item
}
function get_modal_window_HTML() {
  const item = document.createElement("div")
  // FIX: display:none დამატებული — index.html-თან თანმიმდევრული
  item.innerHTML = `<div id="base_modal" class="base-modal" style="display:none;"><div id="base_modalContent" class="base-modal-content"></div></div>`
  return item
}
function get_verification_btn_ss_HTML() {
  const item = document.createElement("div")
  item.id = 'verification_btn_ss'
  item.title = 'SS.GE-ზე ავტორიზაცია'
  item.style.cssText = 'width:34px;height:34px;margin:5px;cursor:pointer;background:#f44336;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;'
  item.textContent = '🔑'
  return item
}

async function append_UI(config) {
  const body = document.querySelector('body')
  if (!body) return

  let inner_container = document.getElementById('inner_container')
  if (!inner_container) {
    inner_container = get_inner_container_HTML()
    inner_container.appendChild(get_buttons_container_HTML())
    body.insertBefore(inner_container, body.firstChild)
  }

  const buttons_container = document.getElementById('buttons_container')
  if (!document.getElementById('base_modal')) inner_container.appendChild(get_modal_window_HTML())
  if (!document.getElementById('loading_gif')) inner_container.appendChild(get_loading_gif_HTML())
  if (!document.getElementById('loading_images')) inner_container.appendChild(get_loading_images_HTML())

  if (config.ss && !document.getElementById('verification_btn_ss')) {
    buttons_container.appendChild(get_verification_btn_ss_HTML())
    document.getElementById('verification_btn_ss').addEventListener('click', () => verification_from_ss(false))
  }

  if (!IS_AUTH) { inner_container.style.display = 'block'; return }

  if (!document.getElementById('open_base_btn')) {
    buttons_container.appendChild(get_base_btn_HTML())
    validate_base_modal()
  }

  if (config.ss && !document.getElementById('save_btn_ss')) {
    const btn = get_save_btn_HTML('save_btn_ss', 'SS.GE-ზე შენახვა', '💾')
    buttons_container.appendChild(btn)
    btn.addEventListener('click', find_draft_SS)
  }

  if (config.myhome && !document.getElementById('save_btn_myhome')) {
    const btn = get_save_btn_HTML('save_btn_myhome', 'Myhome-ზე შენახვა', '💾')
    buttons_container.appendChild(btn)
    btn.addEventListener('click', find_draft_myhome)
  }

  if (!document.getElementById('fast_upload_btn_ss')) {
    const btn = get_save_btn_HTML('fast_upload_btn_ss', 'SS.GE-ზე სწრაფი ატვირთვა', '🏠')
    btn.style.background = '#4CAF50'
    buttons_container.appendChild(btn)
    btn.addEventListener('click', fast_save_upload_to_ss)
  }

  if (!document.getElementById('fast_upload_btn_myhome')) {
    const btn = get_save_btn_HTML('fast_upload_btn_myhome', 'Myhome-ზე სწრაფი ატვირთვა', '🏡')
    btn.style.background = '#FF9800'
    buttons_container.appendChild(btn)
    btn.addEventListener('click', fast_save_upload_to_myhome)
  }

  inner_container.style.display = 'block'
}

function show_loading_images(done_count, total_count) {
  const buttons_container = document.getElementById('buttons_container')
  const loading_gif = document.getElementById('loading_gif')
  const loading_images = document.getElementById('loading_images')
  const loading_images_progress = document.getElementById('loading_images_progress')
  const progress_percent = Math.ceil((done_count / total_count) * 100)
  if (buttons_container) buttons_container.style.display = 'none'
  if (loading_gif) loading_gif.style.display = 'none'
  if (loading_images) loading_images.style.display = 'block'
  if (loading_images_progress) loading_images_progress.style.width = `${progress_percent}%`
}

function toggle_loading_gif(is_active) {
  const loading = document.getElementById('loading_gif')
  const buttons_container = document.getElementById('buttons_container')
  if (loading) loading.style.display = is_active ? 'flex' : 'none'
  if (buttons_container) buttons_container.style.display = is_active ? 'none' : 'flex'
}

function validate_base_modal() {
  const modal = document.getElementById('base_modal')
  const open_btn = document.getElementById('open_base_btn')
  let modal_open = false

  if (open_btn) {
    open_btn.addEventListener('click', async () => {
      modal.style.display = "block"
      modal_open = true
      insers_base_modal()
    })
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === "CLOSE_BASE_MODAL") {
      destroy_base_modal()
      modal_open = false
    }
  })

  window.onclick = (event) => {
    if (!modal_open) return
    if (event.target === modal) {
      destroy_base_modal()
      modal_open = false
    }
  }
}

function destroy_base_modal() {
  const modal = document.getElementById('base_modal')
  const iframe = document.getElementById('myestate_frame')
  const inner = document.getElementById("inner_container")

  if (iframe) iframe.remove()
  if (modal) modal.style.display = "none"
  if (inner) inner.style.display = "block"
}

function insers_base_modal() {
  const inner = document.getElementById("inner_container")
  if (inner) inner.style.display = "none"

  const modal = document.getElementById('base_modal')
  modal.style.display = "block"

  const modalContent = document.getElementById('base_modalContent')
  const token = get_token_from_local_storage()

  if (!token) { alert('ავტორიზაცია საჭიროა!'); return }

  modalContent.innerHTML = `
    <iframe id="myestate_frame" class="frame_custom" scrolling="yes"
      src="${FRONT_URL}?token=${token}"
      height="700" width="900" style="border-radius:12px; border:none;">
    </iframe>
  `
}

//=========================================================================================> SS.GE
async function find_draft_SS() {
  const url = document.URL
  if (!url.includes('/udzravi-qoneba/')) return
  toggle_loading_gif(true)
  const draft = await save_ss(url)
  if (!draft) { toggle_loading_gif(false); return }
  insers_base_modal()
  toggle_loading_gif(false)
}

async function fast_save_upload_to_ss() {
  const url = document.URL
  toggle_loading_gif(true)
  let draft
  if (url.includes('/udzravi-qoneba/')) draft = await save_ss(url)
  else if (url.includes('/pr/')) {
    const next_data = document.getElementById('__NEXT_DATA__').textContent
    const owner_phone = await get_draft_number_MY()
    draft = await save_myhome(url, owner_phone, next_data)
  }
  if (!draft) { toggle_loading_gif(false); return }
  toggle_loading_gif(false)
  window.open(`https://home.ss.ge/ka/udzravi-qoneba/create/SH-${draft.id}`, '_blank')
}

async function save_ss(url) {
  const response = await fetch(`${API_INSTANCE}ss/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${get_token_from_local_storage()}` },
    body: JSON.stringify({ url })
  })
  const json = await response.json()
  if (!response.ok) { toggle_loading_gif(false); alert(json.message); return null }
  return json
}

var AUTO_PAY_SS = false
setTimeout(async () => {
  const url = document.URL
  if (!url.includes('https://home.ss.ge/ka/udzravi-qoneba/create/SH-')) return
  const match = document.URL.match(/\/SH-(\d+)/)
  if (!match) return
  if (url.includes('auto-pay')) AUTO_PAY_SS = true
  const draft_id = Number(match[1])
  if (!draft_id) { alert('განცხადება ვერ მოიძებნა'); return }
  create_home_ss(draft_id)
}, 100)

async function create_home_ss(draft_id) {
  if (!return_access_token_home_ss()) { alert('ss.ge-ზე არ ხართ ავტორიზირებული'); return }
  await delete_draft_home_ss()
  const data = await get_draft_template_SS(draft_id)
  if (!data) { alert('განცხადება ვერ მოიძებნა'); return }
  const ss_template = data.template
  const files = data.files
  ss_template.phoneNumbers = [{ phoneNumber: return_phone_number_home_ss() }]
  if (ss_template.descriptionGe) {
    ss_template['descriptionEn'] = ss_template.descriptionGe
    ss_template['descriptionRu'] = ss_template.descriptionGe
  }
  const first_draft_ss = await create_draft_home_ss(ss_template)
  const draft_id_ss = first_draft_ss.applicationId
  if (!draft_id_ss) { alert('განცხადება ვერ შეიქმნა SS-ზე'); return }
  await post_draft_images_home_ss(first_draft_ss.applicationId, files)
  await update_user_draft_db({ draft_id, ss_id: draft_id_ss })
  window.open(`https://home.ss.ge/ka/udzravi-qoneba/edit/${draft_id_ss}`, "_self")
}

function return_access_token_home_ss() {
  try {
    const obj = JSON.parse(document.getElementById('__NEXT_DATA__').textContent)
    return obj.props.pageProps.session?.accessToken ?? null
  } catch { return null }
}
function return_phone_number_home_ss() {
  try {
    const obj = JSON.parse(document.getElementById('__NEXT_DATA__').textContent)
    return obj.props.pageProps.session?.user?.phone_number ?? null
  } catch { return null }
}

async function get_draft_template_SS(id) {
  const res = await fetch(`${API_INSTANCE}ss/template/${id}`, {
    headers: { "Authorization": `Bearer ${get_token_from_local_storage()}` }
  })
  return res.json()
}
async function create_draft_home_ss(body) {
  const res = await fetch('https://api-gateway.ss.ge/v1/RealEstate/create-draft', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + return_access_token_home_ss(), "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  })
  return res.json()
}
async function delete_draft_home_ss() {
  try {
    await fetch('https://api-gateway.ss.ge/v1/RealEstate/delete-draft', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + return_access_token_home_ss(), "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({})
    })
  } catch {}
}
async function post_draft_images_home_ss(applicationId, files) {
  const base64List = await Promise.all(files.map(f => url_to_base64(`${API_INSTANCE}images/${f}`)))
  let completed = 0
  await Promise.all(base64List.map(async b64 => {
    try {
      await fetch('https://api-gateway.ss.ge/v1/RealEstate/upload-image', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + return_access_token_home_ss(), "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ applicationId, content: b64, is360: false, isGif: false })
      })
    } catch {}
    completed++
    show_loading_images(completed, base64List.length)
  }))
}
async function url_to_base64(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

//=========================================================================================> MYHOME.GE
async function find_draft_myhome() {
  const url = document.URL
  if (!url.includes('/pr/')) return
  toggle_loading_gif(true)
  const owner_phone = await get_draft_number_MY()
  const next_data = document.getElementById('__NEXT_DATA__').textContent
  const draft = await save_myhome(url, owner_phone, next_data)
  if (!draft) { toggle_loading_gif(false); return }
  insers_base_modal()
  toggle_loading_gif(false)
}

async function fast_save_upload_to_myhome() {
  const url = document.URL
  toggle_loading_gif(true)
  let draft
  if (url.includes('/udzravi-qoneba/')) draft = await save_ss(url)
  else if (url.includes('/pr/')) {
    const next_data = document.getElementById('__NEXT_DATA__').textContent
    const owner_phone = await get_draft_number_MY()
    draft = await save_myhome(url, owner_phone, next_data)
  }
  if (!draft) { toggle_loading_gif(false); return }
  toggle_loading_gif(false)
  window.open(`https://www.myhome.ge/ka/SH-${draft.id}/auto-pay/`, '_blank')
}

async function save_myhome(url, owner_phone, next_data) {
  const response = await fetch(`${API_INSTANCE}myhome/save/${owner_phone}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${get_token_from_local_storage()}` },
    body: JSON.stringify({ url, next_data: typeof next_data === 'string' ? JSON.parse(next_data) : next_data })
  })
  const json = await response.json()
  if (!response.ok) { toggle_loading_gif(false); alert(json.message); return null }
  return json
}

var AUTO_PAY_MYHOME = false
setTimeout(async () => {
  const url = document.URL
  if (!url.includes('https://www.myhome.ge/SH-')) return
  const match = document.URL.match(/\/SH-(\d+)/)
  if (!match) return
  if (url.includes('auto-pay')) AUTO_PAY_MYHOME = true
  const draft_id = Number(match[1])
  if (!draft_id) { alert('განცხადება ვერ მოიძებნა'); return }
  create_myhome(draft_id)
}, 100)

async function create_myhome(draft_id) {
  const data = await get_draft_template_Myhome(draft_id)
  if (!data) { alert('განცხადება ვერ მოიძებნა'); return }
  const template = data.template
  const files = data.files
  const form_data = new FormData()
  for (const key in template) { form_data.append(key, template[key]) }

  let completed = 0
  const upload_promises = files.map(async (file, i) => {
    const res = await create_images_MY(`${API_INSTANCE}images/${file}`)
    completed++
    show_loading_images(completed, files.length)
    if (res.result) {
      form_data.append(`images[${i}][image_id]`, res.data.id)
      form_data.append(`images[${i}][url]`, res.data.url)
    }
  })
  await Promise.all(upload_promises)

  const authtoken = get_authorization_token_MY()
  await create_draft_MY(form_data, authtoken, draft_id)
}

async function get_draft_template_Myhome(id) {
  const res = await fetch(`${API_INSTANCE}myhome/template/${id}`, {
    headers: { "Authorization": `Bearer ${get_token_from_local_storage()}` }
  })
  return res.json()
}

async function create_draft_MY(form_data, authtoken, draft_id) {
  const res = await fetch('https://api-statements.tnet.ge/v1/statements/create', {
    method: "POST",
    headers: { "Host": "api-statements.tnet.ge", "Global-Authorization": authtoken },
    body: form_data
  })
  const json = await res.json()
  if (json.data?.uuid) {
    await update_user_draft_db({ draft_id, myhome_id: json.data.uuid })
    if (AUTO_PAY_MYHOME) {
      const payment_resp = await get_pay_uuid_MY(json.data.uuid)
      if (payment_resp) await pay_MY(payment_resp.data.payment_uuid)
    }
    location.href = `https://statements.tnet.ge/ka/statement/edit/${json.data.uuid}?referrer=myhome`
  } else {
    const errs = json.errors?.map(e => e.messages).join(' | ') || 'უცნობი შეცდომა'
    alert(errs)
  }
}

async function create_images_MY(url) {
  const authtoken = get_authorization_token_MY()
  const fetchResponse = await fetch(url)
  const blob = await fetchResponse.blob()
  const file = new File([blob], 'image', { type: blob.type })
  const formData = new FormData()
  formData.append('image', file)
  formData.append('type', 1)
  const res = await fetch('https://api-statements.tnet.ge/v1/files/upload-image', {
    method: "POST",
    headers: { "Host": "api-statements.tnet.ge", "Global-Authorization": authtoken },
    body: formData
  })
  return res.json()
}

async function get_pay_uuid_MY(draft_uuid) {
  try {
    const res = await fetch('https://api-statements.tnet.ge/v2/payments/init-statement-services', {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Website-Key": "myhome", "Global-Authorization": get_access_token_MY() },
      body: JSON.stringify({ statement_uuids: [draft_uuid], service_types: [{ id: 22, day: 30 }] })
    })
    return res.json()
  } catch { return null }
}

async function pay_MY(payment_uuid) {
  try {
    const res = await fetch('https://api-statements.tnet.ge/v2/payments/pay', {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Website-Key": "myhome", "Global-Authorization": get_access_token_MY() },
      body: JSON.stringify({ pay_method: "balance", payment_uuid, redirect_url: "https://statements.tnet.ge/ka/status/pending?referrer=myhome" })
    })
    return res.json()
  } catch { return null }
}

async function get_draft_number_MY() {
  try {
    const siteKey = '6LeziPEpAAAAAHuR9vWBVCrfklSbWt8zixM4jAbM'
    const token = await window.grecaptcha.execute(siteKey, { action: 'submit' })
    const data = JSON.parse(document.getElementById('__NEXT_DATA__').textContent)
    const uuid = data.props.pageProps.dehydratedState.queries[0].state.data.data.statement.uuid
    const res = await fetch(`https://api-statements.tnet.ge/v1/statements/phone/show?statement_uuid=${uuid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Website-Key": "myhome" },
      body: JSON.stringify({ response_token: token })
    })
    const number_data = await res.json()
    return number_data.data.phone_number
  } catch { return null }
}

function get_access_token_MY() {
  const cookies = document.cookie.split(";")
  for (const c of cookies) {
    const [key, value] = c.trim().split('=')
    if (key === 'AccessToken') return value
  }
  return ''
}

function get_authorization_token_MY() {
  const cookies = document.cookie.split(";")
  for (const c of cookies) {
    const [key, value] = c.trim().split('=')
    if (key === 'authorization') return value
  }
  return ''
}

async function update_user_draft_db(data) {
  await fetch(`${API_INSTANCE}users/user_draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${get_token_from_local_storage()}` },
    body: JSON.stringify(data)
  })
}

setTimeout(async () => {
  const url = document.URL
  if (!url.includes('https://www.myhome.ge')) return
  const global_token = get_access_token_MY()
  if (global_token) {
    await fetch(`${API_INSTANCE}myhome/update_global_authorization/${global_token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${get_token_from_local_storage()}` }
    })
  }
}, 500)
