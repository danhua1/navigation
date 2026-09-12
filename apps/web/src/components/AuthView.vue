<template>
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="auth-title">
      <div class="auth-brand" aria-hidden="true">🧭</div>
      <h1 id="auth-title">我的导航</h1>
      <p class="auth-subtitle">登录后管理你的个人网址收藏</p>

      <div v-if="loading" class="auth-loading">正在检查登录状态...</div>
      <template v-else>
        <div class="auth-tabs" role="tablist" aria-label="认证方式">
          <button type="button" :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
          <button type="button" :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
        </div>

        <form class="auth-form" @submit.prevent="submit">
          <label class="form-label" for="auth-email">邮箱</label>
          <input id="auth-email" v-model="form.email" class="form-input" type="email" autocomplete="email" required />

          <template v-if="mode === 'register'">
            <label class="form-label" for="auth-username">用户名</label>
            <input id="auth-username" v-model="form.username" class="form-input" autocomplete="username" required />
          </template>

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
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <button class="btn btn-primary auth-submit" type="submit" :disabled="submitting">
            {{ submitting ? '处理中...' : mode === 'login' ? '登录' : '注册' }}
          </button>
        </form>
      </template>
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
.auth-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: var(--bg-primary); }
.auth-panel { width: min(100%, 420px); padding: 32px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-lg); }
.auth-brand { font-size: 40px; text-align: center; }
h1 { margin-top: 12px; text-align: center; font-size: 24px; }
.auth-subtitle { margin-top: 8px; color: var(--text-secondary); text-align: center; font-size: 14px; }
.auth-tabs { display: grid; grid-template-columns: 1fr 1fr; margin: 28px 0 20px; border-bottom: 1px solid var(--border); }
.auth-tabs button { padding: 10px; color: var(--text-secondary); border-bottom: 2px solid transparent; }
.auth-tabs button.active { color: var(--accent); border-color: var(--accent); font-weight: 600; }
.auth-form { display: grid; gap: 8px; }
.auth-form .form-label:not(:first-child) { margin-top: 8px; }
.auth-submit { width: 100%; justify-content: center; margin-top: 10px; }
.auth-loading { padding: 40px 0; text-align: center; color: var(--text-secondary); }
</style>
