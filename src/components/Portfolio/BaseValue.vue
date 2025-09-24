<template>
		<div class="modal-backdrop" @click.self="close" role="dialog" aria-modal="true" aria-labelledby="base-value-title">
			<div class="modal-content">
				<button class="close-x" @click="close" aria-label="Close Set Base Value Modal">&times;</button>
				<h2 id="base-value-title">Set Base Value</h2>
				<form @submit.prevent="submitBaseValue" aria-label="Set Base Value Form">
					<div class="input-row">
						<label for="amount">Base Value</label>
						<input
							id="amount"
							type="number"
							v-model.number="amount"
							min="0.01"
							step="0.01"
							required
							placeholder="e.g. 1000"
							aria-required="true"
							aria-label="Base Value Amount"
						/>
					</div>
					<div class="modal-actions">
						<button type="submit" class="trade-btn" :disabled="isLoading" aria-label="Set Base Value">
							<span class="btn-content-row">
								<span v-if="isLoading" class="loader4">
									<svg class="spinner" viewBox="0 0 50 50">
										<circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
									</svg>
								</span>
								<span v-if="!isLoading">Set</span>
								<span v-else style="margin-left: 8px;">Processing...</span>
							</span>
						</button>
						<button type="button" class="cancel-btn" @click="close" aria-label="Cancel Set Base Value">Cancel</button>
					</div>
					<div v-if="error" style="color: var(--negative); margin-top: 12px;" role="alert" aria-live="polite">{{ error }}</div>
				</form>
			</div>
		</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const emit = defineEmits(['close', 'base-value-updated', 'notify'])
const props = defineProps({
	user: String,
	apiKey: String,
	portfolio: {
		type: Number,
		required: true
	}
})

const amount = ref(0)
const error = ref('')
const isLoading = ref(false)
const showNotification = (msg: string) => {
	emit('notify', msg)
}

async function submitBaseValue() {
	error.value = ''
	if (!amount.value || amount.value <= 0) {
		error.value = 'Please enter a valid amount.'
		showNotification(error.value)
		return
	}
	isLoading.value = true
	try {
		const response = await fetch('/api/portfolio/basevalue', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': props.apiKey ?? ''
			} as Record<string, string>,
			body: JSON.stringify({
				username: props.user,
				portfolio: props.portfolio,
				baseValue: amount.value
			})
		})
		if (!response.ok) throw new Error('Failed to set base value')
		emit('base-value-updated')
		showNotification('Base value set successfully!')
		close()
	} catch (err) {
		error.value = typeof err === 'object' && err !== null && 'message' in err ? (err as any).message : 'Unknown error'
		showNotification(error.value)
	} finally {
		isLoading.value = false
	}
}

function close() {
	emit('close')
}
</script>

<style scoped>
/* Loader styles for button, copied from Renew.vue/addCash.vue */
.btn-content-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	width: 100%;
}
.loader4 {
	display: flex;
	align-items: center;
	height: 20px;
	margin-right: 10px;
}
.spinner {
	animation: rotate 2s linear infinite;
	width: 25px;
	height: 25px;
}
.path {
	stroke: #000000;
	stroke-linecap: round;
	animation: dash 1.5s ease-in-out infinite;
}
@keyframes rotate {
	100% {
		transform: rotate(360deg);
	}
}
@keyframes dash {
	0% {
		stroke-dasharray: 1, 150;
		stroke-dashoffset: 0;
	}
	50% {
		stroke-dasharray: 90, 150;
		stroke-dashoffset: -35;
	}
	100% {
		stroke-dasharray: 90, 150;
		stroke-dashoffset: -124;
	}
}
.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(24, 25, 38, 0.55);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10000;
	backdrop-filter: blur(2px);
}
.modal-content {
	position: relative;
	background: var(--base2);
	color: var(--text1);
	border-radius: 18px;
	padding: 36px 32px 28px 32px;
	min-width: 340px;
	box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
	display: flex;
	flex-direction: column;
	gap: 18px;
	animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}
.close-x {
	position: absolute;
	top: 18px;
	right: 18px;
	background: none;
	border: none;
	color: var(--text2);
	font-size: 1.7rem;
	cursor: pointer;
	transition: color 0.15s;
	line-height: 1;
	padding: 0;
}
.close-x:hover {
	color: var(--accent1);
}
.input-row {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
label {
	font-size: 1rem;
	color: var(--text2);
	font-weight: 500;
	letter-spacing: 0.01em;
}
input {
	padding: 10px 12px;
	border-radius: 7px;
	border: 1.5px solid var(--base3);
	background: var(--base1);
	color: var(--text1);
	font-size: 1.08rem;
	outline: none;
	transition: border-color 0.18s;
}
input:focus {
	border-color: var(--accent1);
	background: var(--base4);
}
.modal-actions {
	display: flex;
	gap: 16px;
	margin-top: 8px;
	justify-content: flex-end;
}
.trade-btn {
	background: var(--accent1);
	color: var(--text3);
	border: none;
	border-radius: 7px;
	padding: 10px 24px;
	font-weight: 600;
	font-size: 1rem;
	cursor: pointer;
	transition: background 0.18s;
}
.trade-btn:hover {
	background: var(--accent2);
}
.cancel-btn {
	background: transparent;
	color: var(--text2);
	border: 1.5px solid var(--base3);
	border-radius: 7px;
	padding: 10px 24px;
	font-weight: 600;
	font-size: 1rem;
	cursor: pointer;
	transition: border-color 0.18s, color 0.18s;
}
.cancel-btn:hover {
	border-color: var(--accent1);
	color: var(--accent1);
}
</style>
