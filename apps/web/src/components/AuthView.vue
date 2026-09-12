<template>
  <main class="auth-page">
    <section class="auth-shell" aria-labelledby="auth-title">
      <aside class="auth-intro">
        <div class="auth-wordmark"><span aria-hidden="true">N</span> Navigation</div>
        <div class="auth-intro-copy">
          <p class="auth-kicker">PERSONAL LINK INDEX</p>
          <h1 id="auth-title">你的链接，<br />保持有序。</h1>
        </div>
        <p class="auth-footnote">安全会话 · 你的数据专属保存</p>
      </aside>

      <section class="auth-panel" aria-label="账户登录">
        <div v-if="loading" class="auth-loading">正在检查登录状态...</div>
        <template v-else>
          <div class="auth-heading">
            <p class="auth-kicker">ACCOUNT ACCESS</p>
            <h2>{{ mode === 'login' ? '登录工作台' : '创建账户' }}</h2>
          </div>
          <div class="auth-tabs" role="tablist" aria-label="认证方式">
            <button type="button" role="tab" :aria-selected="mode === 'login'" :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
            <button type="button" role="tab" :aria-selected="mode === 'register'" :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
          </div>

          <form class="auth-form" @submit.prevent="submit">
            <div class="auth-field">
              <label class="form-label" for="auth-email">邮箱</label>
              <input id="auth-email" v-model="form.email" class="form-input" type="email" autocomplete="email" required />
            </div>

            <div v-if="mode === 'register'" class="auth-field">
              <label class="form-label" for="auth-username">用户名</label>
              <input id="auth-username" v-model="form.username" class="form-input" autocomplete="username" required />
            </div>

            <div class="auth-field">
              <label class="form-label" for="auth-password">密码</label>
              <input
                id="auth-password"
                v-model="form.password"
                class="form-input"
                type="password"
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                minlength="8"
                required
              />
            </div>
            <p v-if="error" class="form-error" role="alert">{{ error }}</p>
            <button class="btn btn-primary auth-submit" type="submit" :disabled="submitting">
              {{ submitting ? '处理中...' : mode === 'login' ? '登录' : '注册' }}
            </button>
          </form>
        </template>
      </section>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { login, register } from '../api/auth.js'

defineProps({ loading: { type: Boolean, default: false } })
const emit = defineEmits(['authenticated'])
const mode = ref('login')
const form = ref({ email: '', username: '', password: '' })
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    const user = mode.value === 'login'
      ? await login({ email: form.value.email, password: form.value.password })
      : await register(form.value)
    emit('authenticated', user)
  } catch (err) {
    error.value = err.message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page { min-height: 100dvh; display: grid; place-items: center; padding: clamp(16px, 4vw, 48px); background: var(--bg-primary); }
.auth-shell { width: min(100%, 1080px); min-height: min(680px, calc(100dvh - 64px)); display: grid; grid-template-columns: minmax(310px, 1fr) minmax(360px, .88fr); overflow: hidden; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow-lg); }
.auth-intro { min-height: 460px; display: flex; flex-direction: column; padding: clamp(28px, 5vw, 58px); color: #f8fbff; background: #101a35; }.auth-wordmark { display: inline-flex; align-items: center; gap: 9px; font-family: 'DM Mono', ui-monospace, monospace; font-size: 13px; font-weight: 700; }.auth-wordmark span { display: grid; place-items: center; width: 28px; height: 28px; color: #101a35; background: #9bb8ff; border-radius: 5px; }.auth-intro-copy { margin: auto 0; }.auth-kicker { color: var(--accent); font-family: 'DM Mono', ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: .08em; }.auth-intro .auth-kicker { color: #9bb8ff; }.auth-intro h1 { margin-top: 12px; font-size: clamp(32px, 4vw, 50px); line-height: 1.12; letter-spacing: 0; }.auth-footnote { color: #b8c5de; font-size: 12px; }
.auth-panel { align-self: center; width: min(100%, 390px); margin: 0 auto; padding: 34px; }.auth-heading h2 { margin-top: 8px; font-size: 26px; letter-spacing: 0; }.auth-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding: 4px; margin: 28px 0 24px; background: var(--bg-tertiary); border-radius: 6px; }.auth-tabs button { min-height: 40px; border-radius: 4px; color: var(--text-secondary); font-size: 13px; }.auth-tabs button.active { color: var(--text-primary); background: var(--bg-secondary); box-shadow: 0 1px 3px rgba(17, 24, 39, .12); font-weight: 700; }.auth-form { display: grid; gap: 18px; }.auth-field { display: grid; gap: 7px; }.auth-field .form-label { margin: 0; }.auth-field .form-input { min-height: 46px; background: transparent; }.auth-submit { width: 100%; min-height: 46px; justify-content: center; margin-top: 2px; }.auth-loading { min-height: 260px; display: grid; place-items: center; color: var(--text-secondary); }
@media (max-width: 720px) { .auth-page { padding: 0; }.auth-shell { min-height: 100dvh; grid-template-columns: 1fr; border: 0; border-radius: 0; box-shadow: none; }.auth-intro { min-height: 240px; padding: 28px 24px; }.auth-intro-copy { margin: auto 0 0; }.auth-intro h1 { font-size: 32px; }.auth-footnote { display: none; }.auth-panel { width: 100%; padding: 32px 24px 48px; } }
@media (prefers-reduced-motion: reduce) { .auth-tabs button { transition: none; } }
</style>
