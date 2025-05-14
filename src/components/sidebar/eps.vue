<template>
  <div>
    <div v-if="displayedEPSItems.length > 0" id="EPStable">
      <div class="eps-header">
        <div class="eps-cell" style="flex: 0 0 20%;">Reported</div>
        <div class="eps-cell" style="flex: 0 0 40%;">EPS</div>
        <div class="eps-cell" style="flex: 0 0 20%;">Chg (%)</div>
        <div class="eps-cell" style="flex: 0 0 10%;">QoQ</div>
        <div class="eps-cell" style="flex: 0 0 10%;">YoY</div>
      </div>
      <div class="eps-body">
        <div
          v-for="(earnings, index) in displayedEPSItems"
          :key="earnings.fiscalDateEnding"
          class="eps-row"
        >
          <div class="eps-cell" style="flex: 0 0 20%;">
            {{ formatDate(earnings.fiscalDateEnding) }}
          </div>
          <div class="eps-cell" style="flex: 0 0 40%;">
            {{ parseFloat(earnings.reportedEPS).toFixed(2) }}
          </div>

          <div
            class="eps-cell"
            style="flex: 0 0 20%;"
            v-if="(displayedEPSItems.length < 4 && index === displayedEPSItems.length - 1) || (showAllEPS && index === displayedEPSItems.length - 1)"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div
            class="eps-cell"
            style="flex: 0 0 20%;"
            v-else
            :class="calculatePercentageChange(earnings.reportedEPS, assetInfo.quarterlyEarnings[index + 1]?.reportedEPS || 0) > 0 ? 'positive' : 'negative'"
          >
            {{
              isNaN(
                calculatePercentageChange(
                  earnings.reportedEPS,
                  assetInfo.quarterlyEarnings[index + 1]?.reportedEPS || 0
                )
              ) ||
              !isFinite(
                calculatePercentageChange(
                  earnings.reportedEPS,
                  assetInfo.quarterlyEarnings[index + 1]?.reportedEPS || 0
                )
              )
                ? '-'
                : calculatePercentageChange(
                    earnings.reportedEPS,
                    assetInfo.quarterlyEarnings[index + 1]?.reportedEPS || 0
                  ) + '%'
            }}
          </div>

          <div
            class="eps-cell"
            style="flex: 0 0 10%;"
            v-if="(displayedEPSItems.length < 4 && index === displayedEPSItems.length - 1) || (showAllEPS && index === displayedEPSItems.length - 1)"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div class="eps-cell" style="flex: 0 0 10%;" v-else>
            <span
              v-if="getQoQClass(calculateQoQ1(earnings.reportedEPS)) === 'green'"
              class="sphere green-sphere"
            ></span>
            <span v-else class="sphere red-sphere"></span>
          </div>

          <div
            class="eps-cell"
            style="flex: 0 0 10%;"
            v-if="(displayedEPSItems.length < 4 && index === displayedEPSItems.length - 1) || (showAllEPS && index === displayedEPSItems.length - 1)"
          >
            <!-- Leave this cell blank for the last item when showing all or if there are fewer than 4 -->
          </div>
          <div class="eps-cell" style="flex: 0 0 10%;" v-else>
            <span
              v-if="getYoYClass(calculateYoY1(earnings.reportedEPS)) === 'green'"
              class="sphere green-sphere"
            ></span>
            <span v-else class="sphere red-sphere"></span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="displayedEPSItems.length === 0" class="no-data">
      No Quarterly EPS data available
    </div>
    <button
  v-if="showEPSButton"
  @click="$emit('toggle-eps')"
  class="toggle-btn"
>
  {{ showAllEPS ? 'Show Less' : 'Show All' }}
</button>
  </div>
</template>

<script setup>
defineProps([
  'displayedEPSItems',
  'formatDate',
  'showAllEPS',
  'showEPSButton',
  'assetInfo',
  'calculatePercentageChange',
  'calculateQoQ1',
  'calculateYoY1',
  'getQoQClass',
  'getYoYClass',
]);
</script>

<style scoped>
/* Add your styles here */
</style>