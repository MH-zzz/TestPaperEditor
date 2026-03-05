<template>
  <view class="flow-center">
    <view class="flow-center__header">
      <view class="header-left">
        <template v-if="page === 'home'">
          <text class="title">题型流程</text>
          <text class="subtitle">按题型维护流程规则</text>
        </template>

        <template v-else>
          <view class="back" @click="goHome">
            <text class="back__icon">←</text>
            <text class="back__text">返回</text>
          </view>
          <view class="header-titles">
            <text class="title">{{ activeFlowDisplayName || '题型流程' }}</text>
            <text class="subtitle">{{ activeFlowSubtitle || '按题型维护流程规则' }}</text>
          </view>
        </template>
      </view>

      <view class="header-right">
        <template v-if="page !== 'home'">
          <button class="btn btn-outline btn-sm" @click="applyStandardToCurrentQuestion">套用标准到当前题目</button>
          <button class="btn btn-outline btn-sm" @click="showPublishLogs">发布日志</button>
          <button class="btn btn-outline btn-sm" @click="resetStandard">恢复默认</button>
          <button class="btn btn-primary btn-sm" :disabled="!canSaveCurrentStandard" @click="updateCurrentFlowLine">更新当前流程线</button>
        </template>
      </view>
    </view>

    <!-- Home -->
    <scroll-view v-if="page === 'home'" scroll-y class="flow-center__body">
      <view class="flow-grid">
        <view class="flow-card" @tap="openListeningChoice">
          <view class="flow-card__top">
            <text class="flow-card__icon">🎧</text>
            <view class="flow-card__badges">
              <text class="badge">题型流程</text>
              <text class="badge badge--muted">听后选择</text>
            </view>
          </view>
          <text class="flow-card__title">听后选择</text>
          <text class="flow-card__desc">介绍页 → 每题组：播放描述音频 → 倒计时 → 播放正文音频 → 答题</text>
          <view class="flow-card__meta">
            <text class="meta-item">流程线：{{ listeningChoiceFlowLineCount }}</text>
            <text class="meta-dot">·</text>
            <text class="meta-item">影响所有标准题</text>
          </view>
        </view>

        <view class="flow-card" @tap="openSpeakingHearAnswer">
          <view class="flow-card__top">
            <text class="flow-card__icon">🎙️</text>
            <view class="flow-card__badges">
              <text class="badge">题型流程</text>
              <text class="badge badge--muted">听后回答</text>
            </view>
          </view>
          <text class="flow-card__title">听后回答</text>
          <text class="flow-card__desc">介绍页 → 每题组：播放描述音频 → 倒计时 → 播放正文音频 → 提示音(开始录音) → 录音答题 → 提示音(结束录音)</text>
          <view class="flow-card__meta">
            <text class="meta-item">流程线：{{ speakingHearAnswerFlowLineCount }}</text>
            <text class="meta-dot">·</text>
            <text class="meta-item">影响所有标准题</text>
          </view>
        </view>

        <view class="flow-card flow-card--disabled" @tap="toastWip('笔试选择')">
          <view class="flow-card__top">
            <text class="flow-card__icon">📝</text>
            <view class="flow-card__badges">
              <text class="badge badge--muted">开发中</text>
            </view>
          </view>
          <text class="flow-card__title">笔试选择</text>
          <text class="flow-card__desc">无听力材料的选择题题型流程</text>
        </view>
      </view>
    </scroll-view>

    <!-- Detail -->
    <view v-else class="flow-center__detail">
      <view class="detail-body">
        <view class="col col--template">
          <scroll-view scroll-y class="col-scroll">
            <view class="panel">
              <view class="panel__header">
                <view class="panel__header-left">
                  <text class="panel__title">题型模板数据</text>
                  <text class="panel__desc">左侧新建题型模板数据（自动同步到「题型模板」），中间按流程规则解析，右侧预览执行效果</text>
                </view>
                <button class="btn btn-outline btn-xs" @click="reloadDemoBaseFromTemplate">重新加载模板</button>
              </view>
              <view class="panel__body panel__body--template">
                <ListeningChoiceEditor
                  v-if="isListeningChoiceEditorReady"
                  v-model="demoBase"
                  :preview-step-index="currentStepIndex"
                  template-mode
                  :focus-path="templateFocusPath"
                  :question-mode="activeEditorQuestionMode"
                />
                <view v-else class="empty-tip">题型编辑器加载失败，请刷新后重试。</view>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="col col--flow">
          <scroll-view scroll-y class="col-scroll">
            <view class="panel">
              <view class="panel__header">
                <view class="panel__header-left">
                  <text class="panel__title">题型流程图</text>
                  <text class="panel__desc">当前题型的标准执行规则</text>
                  <view class="module-state">
                    <text class="module-state__ref">当前流程线：{{ draftModuleDisplayRef }}</text>
                    <text class="module-state__tag" :class="`is-${currentModuleStatus}`">{{ currentModuleStatusLabel }}</text>
                  </view>
                  <view class="flow-line-switch">
                    <text class="flow-line-switch__label">流程线切换</text>
                    <view class="flow-line-switch__chips">
                      <view
                        v-for="line in flowLineOptions"
                        :key="line.id"
                        class="flow-line-chip"
                        :class="{ active: line.id === draftModuleId }"
                        @tap.stop="onFlowLineChipActivate(line.id)"
                        @click.stop="onFlowLineChipActivate(line.id)"
                      >
                        <text class="flow-line-chip__name">{{ line.name }}</text>
                        <text class="flow-line-chip__meta">{{ line.statusLabel }}</text>
                      </view>
                    </view>
                  </view>
                  <view class="module-meta-grid">
                    <view class="form-item">
                      <text class="form-item__label">流程名称</text>
                      <input
                        class="text-input"
                        :value="draftModuleName"
                        :placeholder="flowNamePlaceholder"
                        @input="(e) => draftModuleName = e.detail.value"
                      />
                    </view>
                    <view class="form-item form-item--full">
                      <text class="form-item__label">流程备注</text>
                      <textarea
                        class="textarea-input"
                        :value="draftModuleNote"
                        placeholder="可选：补充地区、适用场景或执行说明"
                        maxlength="200"
                        @input="(e) => draftModuleNote = e.detail.value"
                      />
                    </view>
                    <view class="form-item form-item--full">
                      <button class="btn btn-outline btn-sm" @click="openFlowLineCreateWizard">新建流程线（向导）</button>
                    </view>
                  </view>
                  <text class="module-state__hint">{{ currentModuleStatusHint }}</text>
                </view>
                <view class="panel__header-actions">
                  <button class="btn btn-outline btn-xs" @click="openReadonlyFlowVisual">查看流程图</button>
                </view>
              </view>
              <view class="panel__body">
                <ListeningChoiceFlowDiagram
                  :question="demoQuestion || demoBase"
                  :steps="demoQuestion?.flow?.steps || []"
                  :active-step-index="currentStepIndex"
                  :sortable="true"
                  :reorderable-indices="reorderableFlowIndices"
                  :show-header-title="false"
                  @select="jumpToStep"
                  @reorder="reorderPerGroupStepByFlowIndex"
                >
                  <template #header-actions>
                    <FlowStepQuickAdd
                      class-name="quick-add-row"
                      :items="flowQuickAddItems"
                      @add="onFlowQuickAdd"
                    />
                  </template>

                  <template #node-extra="{ index }">
                    <view
                      v-if="index === configStepIndex && selectedConfig"
                      class="node-config"
                    >
                      <view class="node-config__head">
                        <text class="node-config__title">步骤配置</text>
                        <text class="node-config__desc">{{ selectedStepLabel }}</text>
                      </view>

                      <view class="step-config">
                        <template v-if="selectedConfig.type === 'intro'">
                          <view class="form-item">
                            <text class="form-item__label">显示标题</text>
                            <view class="toggle" :class="{ active: introShowTitle }" @click="toggleIntroBool('introShowTitle')">
                              {{ introShowTitle ? '是' : '否' }}
                            </view>
                          </view>

                          <view class="form-item">
                            <text class="form-item__label">显示标题补充</text>
                            <view class="toggle" :class="{ active: introShowTitleDescription }" @click="toggleIntroBool('introShowTitleDescription')">
                              {{ introShowTitleDescription ? '是' : '否' }}
                            </view>
                          </view>

                          <view class="form-item">
                            <text class="form-item__label">显示描述</text>
                            <view class="toggle" :class="{ active: introShowDescription }" @click="toggleIntroBool('introShowDescription')">
                              {{ introShowDescription ? '是' : '否' }}
                            </view>
                          </view>
                        </template>

                        <template v-else-if="selectedConfig.type === 'intro_countdown'">
                          <view class="form-item">
                            <text class="form-item__label">倒计时显示标题</text>
                            <view class="toggle" :class="{ active: introCountdownShowTitle }" @click="toggleIntroBool('introCountdownShowTitle')">
                              {{ introCountdownShowTitle ? '是' : '否' }}
                            </view>
                          </view>

                          <view class="form-item form-item--grid">
                            <view>
                              <text class="form-item__label">秒数</text>
                              <input
                                class="text-input"
                                type="number"
                                :value="introCountdownSeconds"
                                @input="(e) => patchIntroCountdown({ introCountdownSeconds: Math.max(0, toInt(e.detail.value)) })"
                              />
                            </view>
                            <view>
                              <text class="form-item__label">标签</text>
                              <input
                                class="text-input"
                                :value="introCountdownLabel"
                                @input="(e) => patchIntroCountdown({ introCountdownLabel: e.detail.value })"
                              />
                            </view>
                          </view>

                          <view class="form-item form-item--full">
                            <text class="form-item__label">提示</text>
                            <text class="form-item__value-hint">倒计时结束不再在此步骤内播放提示音；如需提示音，请插入「提示音」步骤。</text>
                          </view>

                          <view class="step-structure">
                            <text class="step-structure__label">当前步骤</text>
                            <view class="step-structure__actions">
                              <button
                                class="btn btn-text btn-xs danger"
                                @click="disableIntroCountdown"
                              >删除此步骤</button>
                            </view>
                          </view>
                        </template>

                        <template v-else-if="selectedConfig.type === 'per_group'">
                          <view
                            v-if="supportsPerGroupField(selectedConfig.index, 'showTitle')"
                            class="form-item"
                          >
                            <text class="form-item__label">显示标题</text>
                            <view
                              class="toggle"
                              :class="{ active: getPerGroupBool(selectedConfig.index, 'showTitle', true) }"
                              @click="togglePerGroupBool(selectedConfig.index, 'showTitle', true)"
                            >
                              {{ getPerGroupBool(selectedConfig.index, 'showTitle', true) ? '是' : '否' }}
                            </view>
                          </view>

                          <template v-if="selectedConfig.kind === 'playAudio'">
                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'audioSource')"
                              class="form-item form-item--full"
                            >
                              <text class="form-item__label">音频来源</text>
                              <view class="mode-toggle">
                                <view
                                  class="mode-btn"
                                  :class="{ active: getPerGroupAudioSource(selectedConfig.index) === 'description' }"
                                  @click="setPerGroupAudioSource(selectedConfig.index, 'description')"
                                >描述音频</view>
                                <view
                                  class="mode-btn"
                                  :class="{ active: getPerGroupAudioSource(selectedConfig.index) === 'content' }"
                                  @click="setPerGroupAudioSource(selectedConfig.index, 'content')"
                                >正文音频</view>
                              </view>
                            </view>

                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'showQuestionTitle')"
                              class="form-item"
                            >
                              <text class="form-item__label">显示题目标题</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitle', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'showQuestionTitleDescription')"
                              class="form-item"
                            >
                              <text class="form-item__label">显示标题补充</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'showGroupPrompt')"
                              class="form-item"
                            >
                              <text class="form-item__label">显示题组描述</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showGroupPrompt', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showGroupPrompt', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showGroupPrompt', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <template
                              v-if="
                                supportsPerGroupField(selectedConfig.index, 'repeatGapSeconds')
                                && getPerGroupAudioSource(selectedConfig.index) === 'content'
                              "
                            >
                              <view class="form-item">
                                <text class="form-item__label">间隔倒计时</text>
                                <view
                                  class="toggle"
                                  :class="{ active: isPerGroupReplayGapEnabled(selectedConfig.index) }"
                                  @click="togglePerGroupReplayGap(selectedConfig.index)"
                                >
                                  {{ isPerGroupReplayGapEnabled(selectedConfig.index) ? '开' : '关' }}
                                </view>
                              </view>

                              <view v-if="isPerGroupReplayGapEnabled(selectedConfig.index)" class="form-item form-item--full">
                                <text class="form-item__label">间隔秒数</text>
                                <input
                                  class="text-input"
                                  type="number"
                                  :value="getPerGroupRepeatGapSeconds(selectedConfig.index)"
                                  @input="(e) => setPerGroupRepeatGapSeconds(selectedConfig.index, e.detail.value)"
                                />
                              </view>
                            </template>
                          </template>

                          <template v-if="selectedConfig.kind === 'countdown'">
                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'showQuestionTitle')"
                              class="form-item"
                            >
                              <text class="form-item__label">显示题目标题</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitle', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view class="form-item form-item--full">
                              <text class="form-item__label">倒计时来源</text>
                              <text class="form-item__value-hint">秒数来自左侧题型模板的「题组准备时间（秒）」。此处可控制是否显示题目标题/步骤标题。</text>
                            </view>
                          </template>

                          <template v-if="selectedConfig.kind === 'promptTone'">
                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'url')"
                              class="form-item form-item--full"
                            >
                              <text class="form-item__label">提示音 URL</text>
                              <input
                                class="text-input"
                                :value="String(getPerGroupRaw(selectedConfig.index, 'url') || '/static/audio/small_time.mp3')"
                                @input="(e) => patchPerGroupStep(selectedConfig.index, { url: e.detail.value })"
                              />
                            </view>
                          </template>

                          <template v-if="selectedConfig.kind === 'recordGuide'">
                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'showQuestionTitle')"
                              class="form-item"
                            >
                              <text class="form-item__label">显示题目标题</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitle', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'showQuestionTitleDescription')"
                              class="form-item"
                            >
                              <text class="form-item__label">显示标题补充</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'showGroupPrompt')"
                              class="form-item"
                            >
                              <text class="form-item__label">显示题组描述</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showGroupPrompt', false) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showGroupPrompt', false)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showGroupPrompt', false) ? '是' : '否' }}
                              </view>
                            </view>

                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'textSource')"
                              class="form-item form-item--full"
                            >
                              <text class="form-item__label">文案来源</text>
                              <view class="mode-toggle mode-toggle--triple">
                                <view
                                  class="mode-btn"
                                  :class="{ active: getRecordGuideTextSource(selectedConfig.index) === 'question' }"
                                  @click="setRecordGuideTextSource(selectedConfig.index, 'question')"
                                >按小题</view>
                                <view
                                  class="mode-btn"
                                  :class="{ active: getRecordGuideTextSource(selectedConfig.index) === 'group' }"
                                  @click="setRecordGuideTextSource(selectedConfig.index, 'group')"
                                >按题组</view>
                              </view>
                            </view>

                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'audioSource')"
                              class="form-item form-item--full"
                            >
                              <text class="form-item__label">音频来源</text>
                              <view class="mode-toggle mode-toggle--triple">
                                <view
                                  class="mode-btn"
                                  :class="{ active: getRecordGuideAudioSource(selectedConfig.index) === 'question' }"
                                  @click="setRecordGuideAudioSource(selectedConfig.index, 'question')"
                                >按小题</view>
                                <view
                                  class="mode-btn"
                                  :class="{ active: getRecordGuideAudioSource(selectedConfig.index) === 'group' }"
                                  @click="setRecordGuideAudioSource(selectedConfig.index, 'group')"
                                >按题组</view>
                                <view
                                  class="mode-btn"
                                  :class="{ active: getRecordGuideAudioSource(selectedConfig.index) === 'fixed' }"
                                  @click="setRecordGuideAudioSource(selectedConfig.index, 'fixed')"
                                >固定 URL</view>
                              </view>
                            </view>

                            <view
                              v-if="
                                supportsPerGroupField(selectedConfig.index, 'url')
                                && getRecordGuideAudioSource(selectedConfig.index) === 'fixed'
                              "
                              class="form-item form-item--full"
                            >
                              <text class="form-item__label">固定音频 URL</text>
                              <input
                                class="text-input"
                                :value="String(getPerGroupRaw(selectedConfig.index, 'url') || '')"
                                placeholder="/static/audio/xxx.mp3"
                                @input="(e) => patchPerGroupStep(selectedConfig.index, { url: e.detail.value })"
                              />
                            </view>

                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'screenStrategy')"
                              class="form-item form-item--full"
                            >
                              <text class="form-item__label">屏幕策略</text>
                              <view class="mode-toggle mode-toggle--triple">
                                <view
                                  class="mode-btn"
                                  :class="{ active: getRecordGuideScreenStrategy(selectedConfig.index) === 'replaceBody' }"
                                  @click="setRecordGuideScreenStrategy(selectedConfig.index, 'replaceBody')"
                                >替换主体</view>
                                <view
                                  class="mode-btn"
                                  :class="{ active: getRecordGuideScreenStrategy(selectedConfig.index) === 'reusePrevious' }"
                                  @click="setRecordGuideScreenStrategy(selectedConfig.index, 'reusePrevious')"
                                >复用上一屏</view>
                              </view>
                            </view>
                          </template>

                          <template v-if="selectedConfig.kind === 'answerChoice'">
                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'showQuestionTitle')"
                              class="form-item"
                            >
                              <text class="form-item__label">显示题目标题</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitle', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'showQuestionTitleDescription')"
                              class="form-item"
                            >
                              <text class="form-item__label">显示标题补充</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view
                              v-if="supportsPerGroupField(selectedConfig.index, 'showGroupPrompt')"
                              class="form-item"
                            >
                              <text class="form-item__label">显示题组描述</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showGroupPrompt', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showGroupPrompt', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showGroupPrompt', true) ? '是' : '否' }}
                              </view>
                            </view>
                          </template>

                          <view class="step-structure">
                            <text class="step-structure__label">当前步骤</text>
                            <view class="step-structure__actions">
                              <button
                                class="btn btn-text btn-xs danger"
                                @click="removePerGroupStep(selectedConfig.index)"
                              >删除此步骤</button>
                            </view>
                          </view>
                        </template>

                        <template v-else>
                          <view class="empty-tip">该步骤暂无可配置项</view>
                        </template>
                      </view>
                    </view>
                  </template>
                </ListeningChoiceFlowDiagram>

                <view class="diagram-hint">
                  <text class="diagram-hint__text">点击步骤可展开配置；拖动右侧手柄可排序每题组步骤；再次点击同一步骤可收起</text>
                </view>

                <view
                  v-if="isRegionRoutingEnabled"
                  class="region-binding"
                >
                  <view class="region-binding__head">
                    <text class="region-binding__title">地区匹配</text>
                    <text class="region-binding__desc">一个流程线可绑定多个地区；一个地区只能绑定 1 个流程线。「通用」就是默认/标准流程，未命中地区走「通用」。</text>
                  </view>
                  <view v-if="regionBindingOptions.length === 0" class="empty-tip">暂无地区标签，请先在标签管理补充“地区”。</view>
                  <view v-else class="region-binding__chips">
                    <view
                      v-for="region in regionBindingOptions"
                      :key="region"
                      class="region-chip"
                      :class="{ active: isRegionBoundToCurrentFlowLine(region) }"
                      @click="toggleRegionBindingForCurrentFlowLine(region)"
                    >
                      <text class="region-chip__name">{{ region }}</text>
                      <text class="region-chip__target">{{ formatRegionBindingTarget(region) }}</text>
                    </view>
                  </view>

                  <view class="region-template">
                    <view class="region-template__head">
                      <text class="region-template__title">地区流程模板</text>
                      <text class="region-template__desc">把当前“地区 -> 流程线”绑定沉淀为模板，后续可一键应用。</text>
                    </view>
                    <view class="region-template__create">
                      <input
                        class="text-input"
                        :value="regionBindingTemplateName"
                        placeholder="模板名称（可选）"
                        @input="(e) => regionBindingTemplateName = String(e.detail.value || '')"
                      />
                      <button class="btn btn-outline btn-xs" @click="saveRegionBindingTemplateFromCurrent">沉淀当前绑定</button>
                    </view>
                    <view v-if="regionBindingTemplateRows.length > 0" class="region-template__list">
                      <view
                        v-for="item in regionBindingTemplateRows"
                        :key="`region-template:${item.id}`"
                        class="region-template__item"
                      >
                        <view class="region-template__main">
                          <text class="region-template__name">{{ item.name }}</text>
                          <text class="region-template__meta">默认流程：{{ item.defaultTargetText }}</text>
                          <text class="region-template__meta">地区数：{{ item.regionCount }} · {{ item.regionPreviewText }}</text>
                          <text class="region-template__meta">更新于：{{ item.updatedAtText }}</text>
                        </view>
                        <view class="region-template__actions">
                          <button class="btn btn-outline btn-xs" @click="applyRegionBindingTemplate(item.id)">一键应用</button>
                          <button class="btn btn-text btn-xs danger" @click="removeRegionBindingTemplate(item.id)">删除</button>
                        </view>
                      </view>
                    </view>
                    <view v-else class="empty-tip">暂无地区模板，先沉淀一次当前绑定。</view>
                  </view>
                </view>
              </view>
            </view>

            <view v-if="commitValidationIssueList.length > 0" class="panel panel--blocking">
              <view class="panel__header panel__header--blocking">
                <view class="panel__header-left">
                  <text class="panel__title">更新阻断项</text>
                  <text class="panel__desc">修复以下问题后，才能更新流程线</text>
                </view>
                <view class="panel__header-actions">
                  <button class="btn btn-outline btn-xs" @click="jumpToFirstCommitValidationIssue">定位首个问题</button>
                  <button class="btn btn-outline btn-xs" @click="clearCommitValidationIssues">清空</button>
                </view>
              </view>
              <view class="panel__body">
                <view class="blocking-list">
                  <view
                    v-for="item in commitValidationIssueList"
                    :key="item.key"
                    class="blocking-item"
                    :class="{ active: activeCommitValidationIssueKey === item.key }"
                  >
                    <text class="blocking-item__loc">{{ item.locationLabel }}</text>
                    <text class="blocking-item__msg">{{ item.message }}</text>
                    <text class="blocking-item__path">{{ item.path }}</text>
                    <view class="blocking-item__actions">
                      <button class="btn btn-outline btn-xs" @click="jumpToCommitValidationIssue(item)">定位</button>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="col col--preview">
          <PhonePreviewPanel
            v-if="isPhonePreviewPanelReady"
            title="预览"
            :data="previewRenderQuestion"
            :answers="previewAnswers"
            :show-answer="showAnswer"
            :step-index="previewVirtualIndex"
            :total-steps="previewDisplayTotalSteps"
            :nav-step-index="previewVirtualIndex"
            :nav-total-steps="previewDisplayTotalSteps"
            :display-step-index="previewDisplayStepIndex"
            :display-total-steps="previewDisplayTotalSteps"
            :show-runtime-meta="false"
            :preview-scope="readonlyFlowPartialPreviewActive ? 'partial' : 'full'"
            :preview-scope-label="readonlyFlowPartialPreviewLabel"
            :preview-scope-hint="readonlyFlowPartialPreviewHint"
            @prev="previewPrevStep"
            @next="previewNextStep"
            @toggle-answer="showAnswer = !showAnswer"
            @select="onPreviewSelect"
            @step-change="onPreviewStepChange"
            @clear-preview-scope="clearReadonlyFlowPartialPreviewMode"
          />
          <view v-else class="empty-tip">预览组件加载失败，请刷新后重试。</view>
        </view>
      </view>
    </view>

    <view v-if="readonlyFlowVisualVisible" class="flow-visual-modal">
      <view class="flow-visual-modal__mask" @click="closeReadonlyFlowVisual" />
      <view class="flow-visual-modal__panel">
        <view class="flow-visual-modal__header">
          <view class="flow-visual-modal__title-wrap">
            <text class="flow-visual-modal__title">线性流程可视新建</text>
            <text class="flow-visual-modal__desc">拖拽重排、配置属性并实时编译校验，再回写到预览或流程草稿</text>
          </view>
          <view class="flow-visual-modal__actions">
            <button
              class="btn btn-outline btn-xs"
              :disabled="!canReadonlyFlowVisualUndo"
              @click="undoReadonlyFlowVisual"
            >撤销</button>
            <button
              class="btn btn-outline btn-xs"
              :disabled="!canReadonlyFlowVisualRedo"
              @click="redoReadonlyFlowVisual"
            >重做</button>
            <button
              class="btn btn-outline btn-xs"
              :disabled="!readonlyFlowCompileResult.ok"
              @click="applyReadonlyFlowVisualToDraft"
            >应用到流程草稿</button>
            <button
              class="btn btn-outline btn-xs"
              :disabled="!readonlyFlowCompileResult.ok"
              @click="applyReadonlyFlowVisualToPreview"
            >应用到预览</button>
            <button
              class="btn btn-outline btn-xs"
              :disabled="!hasVisualPreviewOverride"
              @click="clearReadonlyFlowVisualPreviewOverride"
            >清除预览覆盖</button>
            <button class="btn btn-outline btn-xs" @click="closeReadonlyFlowVisual">关闭</button>
          </view>
        </view>

        <view class="flow-visual-modal__body">
          <view class="flow-visual-stencil-pane">
            <StencilPanel
              :items="flowVisualStencilItems"
              @add="addReadonlyFlowVisualStep"
              @drag-start="onReadonlyFlowVisualDragStart"
              @drag-end="onReadonlyFlowVisualDragEnd"
            />

            <view class="flow-visual-snippet">
              <view class="flow-visual-snippet__head">
                <text class="flow-visual-snippet__title">流程片段</text>
                <view class="flow-visual-snippet__actions">
                  <button
                    class="btn btn-outline btn-xs"
                    :disabled="!readonlyFlowVisualActiveNodeId"
                    @click="setReadonlyFlowVisualSnippetAnchor"
                  >设起点</button>
                  <button class="btn btn-outline btn-xs" @click="saveReadonlyFlowVisualSnippet">保存片段</button>
                </view>
              </view>
              <text class="flow-visual-snippet__desc">先设置起点，再选中终点节点；保存时会截取“起点到当前”的连续步骤。</text>
              <text class="flow-visual-snippet__meta">当前范围：{{ readonlyFlowSnippetSelectionLabel }}</text>
              <text
                v-if="readonlyFlowSnippetSelectionAnchorId"
                class="flow-visual-snippet__meta"
              >起点节点：{{ readonlyFlowSnippetSelectionAnchorId }}</text>

              <view v-if="readonlyFlowVisualSnippets.length > 0" class="flow-visual-snippet__list">
                <view
                  v-for="item in readonlyFlowVisualSnippets"
                  :key="item.id"
                  class="flow-visual-snippet__item"
                >
                  <view class="flow-visual-snippet__main">
                    <text class="flow-visual-snippet__name">{{ item.name }} · v{{ item.version }}</text>
                    <text class="flow-visual-snippet__steps">{{ formatFlowSnippetStepsText(item.steps) }}</text>
                  </view>
                  <view class="flow-visual-snippet__ops">
                    <button class="btn btn-outline btn-xs" @click="applyReadonlyFlowVisualSnippet(item.id, 'after')">插入到当前后</button>
                    <button class="btn btn-outline btn-xs" @click="applyReadonlyFlowVisualSnippet(item.id, 'end')">追加到末尾</button>
                    <button class="btn btn-outline btn-xs" @click="applyReadonlyFlowVisualSnippetAsMacro(item.id, 'after')">作为宏插入</button>
                  </view>
                </view>
              </view>
              <text v-else class="flow-visual-snippet__empty">暂无片段，点击“保存片段”创建第一条。</text>
            </view>
          </view>

          <view
            class="flow-visual-canvas-dropzone"
            @dragover.stop.prevent
            @drop.stop.prevent="onReadonlyFlowVisualDrop"
          >
            <view class="flow-visual-canvas-wrap" @wheel.stop>
              <ReadonlyFlowCanvas
                :graph="readonlyFlowGraph"
                :active-node-id="readonlyFlowVisualActiveNodeId"
                :recently-moved-node-id="readonlyFlowRecentlyMovedNodeId"
                @select-node="selectReadonlyFlowVisualNode"
                @reorder-node="reorderReadonlyFlowVisualNode"
                @insert-stencil-near-node="insertReadonlyFlowVisualStepNearNode"
                @preview-from-node="previewReadonlyFlowVisualFromNode"
              />
            </view>
          </view>

          <view class="flow-visual-detail">
            <text class="flow-visual-detail__title">节点详情</text>
            <template v-if="readonlyFlowVisualActiveNode">
              <text class="flow-visual-detail__line">节点：{{ readonlyFlowVisualActiveNode.label }}</text>
              <text class="flow-visual-detail__line">kind：{{ readonlyFlowVisualActiveNode.data.stepKind || '-' }}</text>
              <text class="flow-visual-detail__line">stepId：{{ readonlyFlowVisualActiveNode.data.stepId || '-' }}</text>
              <template v-if="readonlyFlowVisualActiveNode.data.stepKind === 'macroNode'">
                <text class="flow-visual-detail__line">片段：{{ readonlyFlowVisualActiveNode.data.snippet?.baseId || '-' }}@v{{ readonlyFlowVisualActiveNode.data.snippet?.version || '-' }}</text>
                <text class="flow-visual-detail__line">Hash：{{ readonlyFlowVisualActiveNode.data.snippet?.hash || '-' }}</text>
                <text class="flow-visual-detail__line">组绑定：{{ readonlyFlowVisualActiveNode.data.binding?.groupBindingMode || '-' }}</text>
                <text class="flow-visual-detail__line">固定题组：{{ readonlyFlowVisualActiveNode.data.binding?.groupId || '-' }}</text>
                <text class="flow-visual-detail__line">上下文题组：{{ readonlyFlowVisualActiveNode.data.groupId || '-' }}</text>
                <text class="flow-visual-detail__line">推进策略：{{ readonlyFlowVisualActiveNode.data.binding?.autoNextMode || '-' }}</text>
                <text class="flow-visual-detail__line">推进覆盖：{{ readonlyFlowVisualActiveNode.data.binding?.autoNext || '-' }}</text>
                <view class="flow-visual-macro-expand">
                  <text class="flow-visual-macro-expand__title">宏展开预览</text>
                  <view
                    v-if="readonlyFlowSelectedMacroExpandedSteps.length > 0"
                    class="flow-visual-macro-expand__list"
                  >
                    <text
                      v-for="(item, idx) in readonlyFlowSelectedMacroExpandedSteps"
                      :key="`macro-expand:${item.id}`"
                      class="flow-visual-detail__line"
                    >{{ idx + 1 }}. {{ item.kind }} · {{ item.autoNext || 'manual' }} · {{ item.groupId || '-' }}</text>
                  </view>
                  <text v-else class="flow-visual-detail__line">当前宏节点尚未展开（请检查片段引用或编译错误）。</text>
                </view>
              </template>
              <template v-else>
                <text class="flow-visual-detail__line">autoNext：{{ readonlyFlowVisualActiveNode.data.autoNext || '-' }}</text>
                <text class="flow-visual-detail__line">题组：{{ readonlyFlowVisualActiveNode.data.groupId || '-' }}</text>
                <text class="flow-visual-detail__line">小题数：{{ readonlyFlowVisualActiveNode.data.questionCount }}</text>
              </template>
            </template>
            <text v-else class="flow-visual-detail__line">暂无节点</text>

            <PropertyPanel
              :node="readonlyFlowVisualActiveNode"
              :fields="readonlyFlowVisualPropertyFields"
              @patch="patchReadonlyFlowVisualNode"
              @remove="removeReadonlyFlowVisualNode"
              @duplicate="duplicateReadonlyFlowVisualNode"
              @move-up="moveReadonlyFlowVisualNodeUp"
              @move-down="moveReadonlyFlowVisualNodeDown"
              @reset="resetReadonlyFlowVisualFromQuestion"
            >
              <template #bulk>
                <view v-if="readonlyFlowVisualBulkPanelVisible" class="flow-visual-bulk">
                  <view class="flow-visual-bulk__head">
                    <text class="flow-visual-bulk__title">批量属性面板</text>
                    <text class="flow-visual-bulk__meta">已选 {{ readonlyFlowVisualBulkSelectionCount }} 个节点（起点 → 当前）</text>
                  </view>
                  <text class="flow-visual-bulk__desc">仅显示交集属性；批量应用会走同一校验链路并进入撤销栈。</text>

                  <view
                    v-for="field in readonlyFlowVisualBulkFields"
                    :key="`bulk:${field.key}`"
                    class="flow-visual-bulk__field"
                  >
                    <view class="flow-visual-bulk__field-head">
                      <text class="flow-visual-bulk__label">{{ field.label }}</text>
                      <text class="flow-visual-bulk__state">{{ isReadonlyFlowVisualBulkFieldTouched(field.key) ? '待应用' : '未设置' }}</text>
                    </view>

                    <template v-if="field.type === 'select'">
                      <view class="flow-visual-bulk__chips">
                        <text
                          v-for="option in field.options || []"
                          :key="`bulk:${field.key}:${option.value}`"
                          class="flow-visual-bulk__chip"
                          :class="{ active: readReadonlyFlowVisualBulkFieldDraft(field.key) === option.value }"
                          @click="setReadonlyFlowVisualBulkFieldDraft(field.key, option.value)"
                        >{{ option.label }}（{{ option.value }}）</text>
                      </view>
                    </template>

                    <input
                      class="flow-visual-bulk__input"
                      :value="readReadonlyFlowVisualBulkFieldDraft(field.key)"
                      :placeholder="field.placeholder || '输入后点击应用'"
                      @input="(e) => setReadonlyFlowVisualBulkFieldDraft(field.key, e.detail.value)"
                    />
                  </view>

                  <view class="flow-visual-bulk__actions">
                    <button class="btn btn-outline btn-xs" @click="resetReadonlyFlowVisualBulkPatchDraft">重置批量草稿</button>
                    <button class="btn btn-outline btn-xs" @click="applyReadonlyFlowVisualBulkPatch">应用到选中步骤</button>
                  </view>
                </view>
              </template>
            </PropertyPanel>

            <view class="flow-visual-compile">
              <text class="flow-visual-detail__title">线性编译结果</text>
              <text class="flow-visual-detail__line">预览覆盖：{{ hasVisualPreviewOverride ? '已启用' : '未启用' }}</text>
              <text class="flow-visual-detail__line">可视脏状态：{{ flowVisualDebugInfo.dirty ? 'dirty' : 'clean' }}</text>
              <text class="flow-visual-detail__line">最近动作：{{ flowVisualDebugInfo.lastDirtyAction || '-' }} @ {{ formatFlowVisualDebugTime(flowVisualDebugInfo.lastDirtyAt) }}</text>
              <text class="flow-visual-detail__line">最近清理：{{ flowVisualDebugInfo.lastCleanReason || '-' }} @ {{ formatFlowVisualDebugTime(flowVisualDebugInfo.lastCleanAt) }}</text>
              <view class="flow-visual-constraint">
                <text class="flow-visual-constraint__title">线性约束</text>
                <view class="flow-visual-constraint__list">
                  <view
                    v-for="check in readonlyFlowLinearChecks"
                    :key="check.key"
                    class="flow-visual-constraint__item"
                    :class="{ 'is-ok': check.ok, 'is-error': !check.ok }"
                  >
                    <text class="flow-visual-constraint__label">{{ check.label }}</text>
                    <text class="flow-visual-constraint__detail">{{ check.detail }}</text>
                  </view>
                </view>
              </view>
              <template v-if="readonlyFlowCompileResult.ok">
                <text class="flow-visual-compile__status is-ok">状态：可编译（{{ readonlyFlowCompileResult.steps.length }} steps）</text>
                <view class="flow-visual-compile__list">
                  <view
                    v-for="(item, index) in readonlyFlowCompiledStepPreview"
                    :key="item.id"
                    class="flow-visual-compile__issue"
                    :class="{ 'is-locatable': readFlowVisualCompiledStepNodeId(item.id) }"
                    @click="locateReadonlyFlowVisualCompiledStep(item.id)"
                  >
                    <text class="flow-visual-detail__line">{{ formatReadonlyFlowCompiledStepLine(item, index) }}</text>
                    <text
                      v-if="readFlowVisualCompiledStepNodeId(item.id)"
                      class="flow-visual-compile__issue-action"
                    >点击定位</text>
                  </view>
                </view>
                <template v-if="readonlyFlowCompileResult.warnings.length > 0">
                  <text class="flow-visual-compile__status is-warning">编译提醒（{{ readonlyFlowCompileResult.warnings.length }}）</text>
                  <view class="flow-visual-compile__list">
                    <view
                      v-for="item in readonlyFlowCompileResult.warnings.slice(0, 5)"
                      :key="`warn:${item.code}:${item.path}`"
                      class="flow-visual-compile__issue is-warning"
                      :class="{ 'is-locatable': readFlowVisualIssueNodeId(item.path) }"
                      @click="locateReadonlyFlowVisualIssue(item.path)"
                    >
                      <text class="flow-visual-detail__line">{{ item.code }} · {{ item.message }}</text>
                      <text
                        v-if="readFlowVisualIssueNodeId(item.path)"
                        class="flow-visual-compile__issue-action"
                      >点击定位</text>
                    </view>
                  </view>
                </template>
              </template>
              <template v-else>
                <text class="flow-visual-compile__status is-error">状态：不可编译（{{ readonlyFlowCompileResult.errors.length }} errors）</text>
                <view class="flow-visual-compile__list">
                  <view
                    v-for="item in readonlyFlowCompileResult.errors.slice(0, 5)"
                    :key="`${item.code}:${item.path}`"
                    class="flow-visual-compile__issue"
                    :class="{ 'is-locatable': readFlowVisualIssueNodeId(item.path) }"
                    @click="locateReadonlyFlowVisualIssue(item.path)"
                  >
                    <text class="flow-visual-detail__line">{{ item.code }} · {{ item.message }}</text>
                    <text
                      v-if="readFlowVisualIssueNodeId(item.path)"
                      class="flow-visual-compile__issue-action"
                    >点击定位</text>
                  </view>
                </view>
                <template v-if="readonlyFlowCompileResult.warnings.length > 0">
                  <text class="flow-visual-compile__status is-warning">编译提醒（{{ readonlyFlowCompileResult.warnings.length }}）</text>
                  <view class="flow-visual-compile__list">
                    <view
                      v-for="item in readonlyFlowCompileResult.warnings.slice(0, 5)"
                      :key="`warn:${item.code}:${item.path}`"
                      class="flow-visual-compile__issue is-warning"
                      :class="{ 'is-locatable': readFlowVisualIssueNodeId(item.path) }"
                      @click="locateReadonlyFlowVisualIssue(item.path)"
                    >
                      <text class="flow-visual-detail__line">{{ item.code }} · {{ item.message }}</text>
                      <text
                        v-if="readFlowVisualIssueNodeId(item.path)"
                        class="flow-visual-compile__issue-action"
                      >点击定位</text>
                    </view>
                  </view>
                </template>
              </template>
              <template v-if="readonlyFlowQuickFixSuggestions.length > 0">
                <text class="flow-visual-compile__status is-fix">一键修复建议（{{ readonlyFlowQuickFixSuggestions.length }}）</text>
                <view class="flow-visual-fix-list">
                  <view
                    v-for="item in readonlyFlowQuickFixSuggestions"
                    :key="item.key"
                    class="flow-visual-fix-item"
                  >
                    <view class="flow-visual-fix-item__main">
                      <text class="flow-visual-fix-item__title">{{ item.label }}</text>
                      <text class="flow-visual-fix-item__detail">{{ item.detail }}</text>
                    </view>
                    <button
                      class="btn btn-outline btn-xs flow-visual-fix-item__btn"
                      @click="applyReadonlyFlowVisualQuickFix(item.key)"
                    >应用</button>
                  </view>
                </view>
              </template>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="flowLineWizardVisible" class="flow-line-wizard-modal">
      <view class="flow-line-wizard-modal__mask" @click="closeFlowLineCreateWizard" />
      <view class="flow-line-wizard-modal__panel">
        <view class="flow-line-wizard-modal__header">
          <view class="flow-line-wizard-modal__title-wrap">
            <text class="flow-line-wizard-modal__title">新建流程线（向导）</text>
            <text class="flow-line-wizard-modal__desc">基于模板创建并可直接绑定地区，一次完成创建与发布。</text>
          </view>
          <button class="btn btn-outline btn-xs" @click="closeFlowLineCreateWizard">关闭</button>
        </view>

        <view class="flow-line-wizard-modal__body">
          <view class="wizard-section">
            <text class="wizard-section__title">1. 选择基线</text>
            <view class="wizard-baseline">
              <view
                class="wizard-baseline__chip"
                :class="{ active: flowLineWizardBaseline === 'current' }"
                @click="flowLineWizardBaseline = 'current'"
              >
                <text class="wizard-baseline__name">复制当前流程线</text>
                <text class="wizard-baseline__desc">保留当前配置再微调</text>
              </view>
              <view
                class="wizard-baseline__chip"
                :class="{ active: flowLineWizardBaseline === 'standard' }"
                @click="flowLineWizardBaseline = 'standard'"
              >
                <text class="wizard-baseline__name">基于标准创建</text>
                <text class="wizard-baseline__desc">从标准流程线开始</text>
              </view>
            </view>
          </view>

          <view class="wizard-section">
            <text class="wizard-section__title">2. 填写信息</text>
            <view class="wizard-form">
              <view class="form-item">
                <text class="form-item__label">流程线名称</text>
                <input
                  class="text-input"
                  :value="flowLineWizardName"
                  :placeholder="flowWizardNamePlaceholder"
                  @input="(e) => flowLineWizardName = String(e.detail.value || '')"
                />
              </view>
              <view class="form-item form-item--full">
                <text class="form-item__label">流程线备注（可选）</text>
                <textarea
                  class="textarea-input"
                  :value="flowLineWizardNote"
                  :placeholder="flowWizardNotePlaceholder"
                  maxlength="200"
                  @input="(e) => flowLineWizardNote = String(e.detail.value || '')"
                />
              </view>
            </view>
          </view>

          <view v-if="isRegionRoutingEnabled" class="wizard-section">
            <text class="wizard-section__title">3. 绑定地区（可多选）</text>
            <text class="wizard-section__desc">一个地区只能绑定 1 个流程线，勾选后会自动改绑到新流程线；勾选「通用」将设置默认/标准流程。</text>
            <view v-if="regionBindingOptions.length === 0" class="empty-tip">暂无地区标签，请先在标签管理补充“地区”。</view>
            <view v-else class="wizard-region">
              <view
                v-for="region in regionBindingOptions"
                :key="`wizard:${region}`"
                class="wizard-region__chip"
                :class="{ active: isFlowLineWizardRegionSelected(region) }"
                @click="toggleFlowLineWizardRegion(region)"
              >
                <text class="wizard-region__name">{{ region }}</text>
                <text class="wizard-region__desc">{{ isFlowLineWizardRegionSelected(region) ? '将绑定到新流程线' : '点击绑定' }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="flow-line-wizard-modal__footer">
          <text class="flow-line-wizard-modal__summary">已选择地区：{{ flowLineWizardRegions.length }} 个</text>
          <view class="flow-line-wizard-modal__actions">
            <button class="btn btn-outline btn-sm" @click="closeFlowLineCreateWizard">取消</button>
            <button class="btn btn-primary btn-sm" :disabled="!canCreateFlowLineFromWizard" @click="confirmCreateFlowLineFromWizard">创建并发布</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  FlowAutoNext,
  FlowModuleRef,
  FlowModuleStatus,
  FlowProfileV1,
  ListeningChoiceContent,
  ListeningChoiceFlowModuleV1,
  ListeningChoiceQuestion,
  Question,
  SpeakingHearAnswerContent,
  SpeakingHearAnswerQuestion
} from '/types'
import ListeningChoiceEditor from '/components/editor/ListeningChoiceEditor.vue'
import ListeningChoiceFlowDiagram from '/components/editor/ListeningChoiceFlowDiagram.vue'
import FlowStepQuickAdd from '/components/editor/FlowStepQuickAdd.vue'
import ReadonlyFlowCanvas from '/components/editor/flow-visual/ReadonlyFlowCanvas.vue'
import StencilPanel from '/components/editor/flow-visual/StencilPanel.vue'
import PropertyPanel from '/components/editor/flow-visual/PropertyPanel.vue'
import PhonePreviewPanel from '/components/layout/PhonePreviewPanel.vue'
import { contentTemplates } from '/stores/contentTemplates'
import { flowModules } from '/stores/flowModules'
import { flowSnippets } from '/stores/flowSnippets'
import { flowProfiles } from '/stores/flowProfiles'
import { questionDraft } from '/stores/questionDraft'
import { appShell } from '/stores/appShell'
import { tagStore } from '/stores/tag'
import { runtimeDebug, type RuntimeDebugEvent } from '/stores/runtimeDebug'
import {
  patchListeningChoiceQuestionFlow
} from './flow-modules/currentQuestionBridge'
import { loadRecentQuestions } from '/infra/repository/questionRepository'
import { generateId } from '/templates'
import { deepClone } from '/utils/deepClone'
import { buildModuleDiffSummary, formatModuleDiffSummary } from '/domain/flow-module/usecases/buildModuleDiffSummary'
import { validateListeningChoiceModuleCommitCrossChecks } from '/domain/flow-module/usecases/validateModuleCommitCrossChecks'
import {
  DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
  LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID,
  LISTENING_CHOICE_STANDARD_FLOW_ID,
  type ListeningChoiceStandardFlowModuleV1,
  materializeListeningChoiceStandardSteps,
  validateListeningChoiceStandardModule
} from '../../flows/listeningChoiceFlowModules'
import {
  usePerGroupStepEditor,
  type QuickAddPerGroupKind
} from './flow-modules/usePerGroupStepEditor'
import { useCommitValidationIssues } from './flow-modules/useCommitValidationIssues'
import { useRegionBindingOverview } from './flow-modules/useRegionBindingOverview'
import { useRegionBindingTemplates } from './flow-modules/useRegionBindingTemplates'
import { useFlowLineWizard } from './flow-modules/useFlowLineWizard'
import { useFlowPreviewPanel } from './flow-modules/useFlowPreviewPanel'
import { useFlowPageNavigation } from './flow-modules/useFlowPageNavigation'
import { useFlowLineSwitcher } from './flow-modules/useFlowLineSwitcher'
import {
  useEditableFlowGraph,
  type FlowPropertyFieldKey,
  type FlowVisualNodePatch
} from './flow-modules/useEditableFlowGraph'
import type { VisualLinearStep } from '/domain/flow-visual/usecases/compileGraphToSteps'
import { buildListeningChoiceModuleFromLinearSteps } from '/domain/flow-visual/usecases/buildListeningChoiceModuleFromLinearSteps'
import type { FlowSnippetTemplateStep } from '/domain/flow-visual/usecases/buildFlowSnippetTemplate'
import {
  useModuleLifecycle,
  type ModuleCommitValidationPayload,
  type ModuleCommitValidationResult
} from './flow-modules/useModuleLifecycle'

type FlowPageType = 'listening_choice' | 'speaking_hear_answer'
type Page = 'home' | FlowPageType
const DEFAULT_LISTENING_CHOICE_MODULE_NAME = '听后选择标准'
const DEFAULT_LISTENING_HEAR_ANSWER_MODULE_NAME = '听后回答标准'

function clone<T>(v: T): T {
  return deepClone(v)
}

function getCurrentQuestionSnapshot(): Question | null {
  const current = questionDraft.state.currentQuestion
  if (!current || typeof current !== 'object') return null
  return clone(current)
}

function persistCurrentQuestion(next: Question) {
  questionDraft.updateDraft(next, { persistDraft: true })
}

function makeStableIdFactory(prefix = 'demo_step') {
  let i = 0
  return () => `${prefix}_${++i}`
}

function toInt(v: unknown): number {
  const n = parseInt(String(v || '0'), 10)
  return Number.isFinite(n) ? n : 0
}

function formatAutoNextReason(autoNext: string): string {
  const value = String(autoNext || '').trim()
  if (!value) return '未配置自动推进'
  if (value === 'audioEnded') return '音频播放结束后自动进入下一步'
  if (value === 'countdownEnded') return '倒计时结束后自动进入下一步'
  if (value === 'timeEnded') return '作答时间结束后自动进入下一步'
  if (value === 'tapNext') return '需手动点击下一步'
  return `自定义触发：${value}`
}

function toFlowAutoNext(value: string | undefined): FlowAutoNext {
  if (value === 'audioEnded') return 'audioEnded'
  if (value === 'countdownEnded') return 'countdownEnded'
  if (value === 'timeEnded') return 'timeEnded'
  return 'tapNext'
}

function buildPreviewFlowStepFromVisual(
  item: VisualLinearStep,
  index: number,
  fallbackGroupId: string,
  fallbackSeconds: number
): ListeningChoiceQuestion['flow']['steps'][number] {
  const kind = String(item.kind || '').trim()
  const id = String(item.id || `visual_step_${index + 1}`)
  const autoNext = toFlowAutoNext(item.autoNext)
  const groupId = String(item.groupId || fallbackGroupId || '')

  if (kind === 'intro') {
    return {
      id,
      kind: 'intro',
      autoNext,
      showTitle: true
    }
  }

  if (kind === 'countdown') {
    return {
      id,
      kind: 'countdown',
      autoNext,
      seconds: Math.max(0, fallbackSeconds),
      label: '倒计时'
    }
  }

  if (kind === 'playAudio') {
    return {
      id,
      kind: 'playAudio',
      autoNext,
      groupId,
      audioSource: 'content',
      showTitle: true
    }
  }

  if (kind === 'promptTone') {
    return {
      id,
      kind: 'promptTone',
      autoNext,
      groupId: groupId || undefined,
      url: '/static/audio/small_time.mp3'
    }
  }

  if (kind === 'recordGuide') {
    return {
      id,
      kind: 'recordGuide',
      autoNext,
      groupId: groupId || undefined,
      questionIds: [],
      showTitle: false,
      showQuestionTitle: true,
      showQuestionTitleDescription: true,
      showGroupPrompt: false,
      guideAudioUrl: ''
    }
  }

  if (kind === 'answerChoice') {
    return {
      id,
      kind: 'answerChoice',
      autoNext,
      groupId: groupId || undefined
    }
  }

  if (kind === 'groupPrompt') {
    return {
      id,
      kind: 'groupPrompt',
      autoNext,
      groupId
    }
  }

  if (kind === 'finish') {
    return {
      id,
      kind: 'finish',
      autoNext,
      text: '流程完成'
    }
  }

  return {
    id,
    kind: 'intro',
    autoNext,
    showTitle: true,
    title: `未识别步骤：${kind || 'unknown'}`
  }
}

function normalizeText(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function normalizeModuleName(name: unknown, fallback = DEFAULT_LISTENING_CHOICE_MODULE_NAME): string {
  return normalizeText(name) || fallback
}

function normalizeModuleNote(note: unknown): string {
  return normalizeText(note) || ''
}

function moduleNameFallbackById(id: string): string {
  if (id === LISTENING_CHOICE_STANDARD_FLOW_ID) return DEFAULT_LISTENING_CHOICE_MODULE_NAME
  if (id === LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID) return DEFAULT_LISTENING_HEAR_ANSWER_MODULE_NAME
  return id
}

function normalizeFlowModuleStatus(value: unknown): FlowModuleStatus {
  if (value === 'draft' || value === 'published' || value === 'archived') return value
  return 'draft'
}

function formatFlowModuleStatusLabel(status: FlowModuleStatus): string {
  if (status === 'published') return '已发布'
  if (status === 'archived') return '已归档'
  return '草稿'
}

type ModuleDisplayRefLike = Partial<FlowModuleRef & { name?: string | null }> | null | undefined

function formatModuleDisplayRef(refLike: ModuleDisplayRefLike): string {
  const fallbackId = getStandardModuleIdByPageType(activeFlowPageType.value)
  const id = String(refLike?.id || fallbackId)
  const version = Math.max(1, toInt(refLike?.version || 1))
  const hit = flowModules.getListeningChoiceByRef({ id, version })
  const name = normalizeModuleName(refLike?.name || hit?.name, moduleNameFallbackById(id))
  return name
}

function formatFlowProfileLabel(profileLike: Partial<FlowProfileV1> | null | undefined): string {
  const note = normalizeNullableText(profileLike?.note)
  if (note) return note
  return '未命名规则'
}

function formatFlowProfileLabelById(id: string): string {
  const hit = flowProfiles.getById(String(id || ''))
  return formatFlowProfileLabel(hit || null)
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toDraftStandardModule(moduleInput: unknown): ListeningChoiceStandardFlowModuleV1 {
  const m = isObjectRecord(moduleInput) ? moduleInput : {}
  return {
    version: 1,
    id: String(m.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
    introShowTitle: m.introShowTitle,
    introShowTitleDescription: m.introShowTitleDescription,
    introShowDescription: m.introShowDescription,
    introCountdownEnabled: m.introCountdownEnabled,
    introCountdownShowTitle: m.introCountdownShowTitle,
    introCountdownSeconds: m.introCountdownSeconds,
    introCountdownLabel: m.introCountdownLabel,
    perGroupSteps: Array.isArray(m.perGroupSteps) ? m.perGroupSteps : []
  }
}

function getStandardModuleIdByPageType(pageType: FlowPageType): string {
  return pageType === 'speaking_hear_answer'
    ? LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID
    : LISTENING_CHOICE_STANDARD_FLOW_ID
}

function getDefaultModuleNameByPageType(pageType: FlowPageType): string {
  return pageType === 'speaking_hear_answer'
    ? DEFAULT_LISTENING_HEAR_ANSWER_MODULE_NAME
    : DEFAULT_LISTENING_CHOICE_MODULE_NAME
}

function getFlowLineIdPrefixByPageType(pageType: FlowPageType): string {
  return pageType === 'speaking_hear_answer'
    ? 'listening_hear_answer.line'
    : 'listening_choice.line'
}

function isModuleIdMatchPageType(moduleIdInput: unknown, pageType: FlowPageType): boolean {
  const moduleId = String(moduleIdInput || '').trim()
  if (!moduleId) return false
  if (pageType === 'speaking_hear_answer') {
    return moduleId === LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID || moduleId.startsWith('listening_hear_answer.line.')
  }
  return moduleId !== LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID && !moduleId.startsWith('listening_hear_answer.line.')
}

function getDefaultModule(pageType: FlowPageType = 'listening_choice'): ListeningChoiceFlowModuleV1 {
  const standardId = getStandardModuleIdByPageType(pageType)
  const defaultName = getDefaultModuleNameByPageType(pageType)
  const module = flowModules.getListeningChoiceDefault(standardId)
  if (module) return module
  return {
    kind: 'listening_choice',
    id: standardId,
    version: 1,
    name: defaultName,
    note: '',
    status: 'published',
    ...DEFAULT_LISTENING_CHOICE_STANDARD_MODULE
  }
}

function emptyRichText(): ListeningChoiceContent['intro']['text'] {
  return {
    type: 'richtext',
    content: []
  }
}

function normalizeListeningChoiceContentFromHearAnswer(
  contentInput: SpeakingHearAnswerContent
): ListeningChoiceContent {
  const content = contentInput || ({ intro: { text: emptyRichText() }, groups: [] } as SpeakingHearAnswerContent)
  return {
    intro: content.intro || { text: emptyRichText() },
    groups: (content.groups || []).map((group, gIndex) => ({
      ...group,
      id: String(group?.id || `flow_demo_ha_g_${gIndex + 1}`),
      subQuestions: (group.subQuestions || []).map((sq, sqIndex) => ({
        id: String(sq?.id || `flow_demo_ha_q_${gIndex + 1}_${sqIndex + 1}`),
        order: Number(sq?.order || sqIndex + 1),
        stem: sq?.stem || emptyRichText(),
        audio: sq?.audio,
        options: [],
        answerMode: 'single',
        answer: []
      }))
    }))
  }
}

function normalizeSpeakingHearAnswerContentFromListening(
  contentInput: ListeningChoiceContent
): SpeakingHearAnswerContent {
  const content = contentInput || ({ intro: { text: emptyRichText() }, groups: [] } as ListeningChoiceContent)
  return {
    intro: content.intro || { text: emptyRichText() },
    groups: (content.groups || []).map((group, gIndex) => ({
      ...group,
      id: String(group?.id || `tpl_ha_g_${gIndex + 1}`),
      subQuestions: (group.subQuestions || []).map((sq, sqIndex) => ({
        id: String(sq?.id || `tpl_ha_q_${gIndex + 1}_${sqIndex + 1}`),
        order: Number(sq?.order || sqIndex + 1),
        stem: sq?.stem || emptyRichText(),
        audio: sq?.audio
      }))
    }))
  }
}

function isHearAnswerQuestion(question: Question | null | undefined): question is Question {
  if (!question || typeof question !== 'object') return false
  if (question.type === 'speaking_hear_answer') return true
  if (question.type !== 'listening_choice') return false
  const metadata = isObjectRecord((question as { metadata?: unknown }).metadata)
    ? (question as { metadata?: Record<string, unknown> }).metadata || {}
    : {}
  const variant = typeof metadata.questionVariant === 'string' ? metadata.questionVariant.trim() : ''
  return variant === 'hear_answer'
}

function isListeningChoiceQuestion(question: Question | null | undefined): question is Question {
  if (!question || typeof question !== 'object') return false
  if (question.type !== 'listening_choice') return false
  const metadata = isObjectRecord((question as { metadata?: unknown }).metadata)
    ? (question as { metadata?: Record<string, unknown> }).metadata || {}
    : {}
  const variant = typeof metadata.questionVariant === 'string' ? metadata.questionVariant.trim() : ''
  return variant !== 'hear_answer'
}

function pickLibraryQuestionForFlowPage(pageType: FlowPageType): Question | null {
  const current = questionDraft.state.currentQuestion as Question | null
  if (pageType === 'speaking_hear_answer' && isHearAnswerQuestion(current)) return clone(current)
  if (pageType === 'listening_choice' && isListeningChoiceQuestion(current)) return clone(current)

  const recent = loadRecentQuestions<Question>()
  if (!Array.isArray(recent) || recent.length <= 0) return null
  if (pageType === 'speaking_hear_answer') {
    const hit = recent.find((item) => isHearAnswerQuestion(item))
    return hit ? clone(hit) : null
  }
  const hit = recent.find((item) => isListeningChoiceQuestion(item))
  return hit ? clone(hit) : null
}

function syncTemplateFromLibraryQuestion(pageType: FlowPageType): boolean {
  const hit = pickLibraryQuestionForFlowPage(pageType)
  if (!hit) return false

  if (pageType === 'speaking_hear_answer') {
    if (hit.type === 'speaking_hear_answer') {
      contentTemplates.setSpeakingHearAnswer({
        version: 1,
        content: clone(hit.content as SpeakingHearAnswerContent)
      })
      return true
    }
    contentTemplates.setSpeakingHearAnswer({
      version: 1,
      content: normalizeSpeakingHearAnswerContentFromListening(clone(hit.content as ListeningChoiceContent))
    })
    return true
  }

  if (hit.type === 'listening_choice') {
    contentTemplates.setListeningChoice({
      version: 1,
      optionStyle: String((hit as { optionStyle?: unknown }).optionStyle || 'ABCD') === '1234' ? '1234' : 'ABCD',
      content: clone(hit.content as ListeningChoiceContent)
    })
    return true
  }

  contentTemplates.setListeningChoice({
    version: 1,
    optionStyle: 'ABCD',
    content: normalizeListeningChoiceContentFromHearAnswer(clone(hit.content as SpeakingHearAnswerContent))
  })
  return true
}

function buildQuestionFromTemplate(pageType: FlowPageType = 'listening_choice'): ListeningChoiceQuestion {
  const defaultModule = getDefaultModule(pageType)
  const isHearAnswer = pageType === 'speaking_hear_answer'
  const listeningChoiceTemplate = contentTemplates.state.listeningChoice
  const hearAnswerTemplate = contentTemplates.state.speakingHearAnswer
  return {
    id: isHearAnswer ? 'flow_demo:speaking_hear_answer' : 'flow_demo:listening_choice',
    type: 'listening_choice',
    optionStyle: isHearAnswer ? 'ABCD' : (listeningChoiceTemplate.optionStyle || 'ABCD'),
    metadata: isHearAnswer ? { questionVariant: 'hear_answer' } : undefined,
    content: isHearAnswer
      ? normalizeListeningChoiceContentFromHearAnswer(clone(hearAnswerTemplate.content))
      : clone(listeningChoiceTemplate.content),
    flow: {
      version: 1,
      mode: 'semi-auto',
      source: {
        kind: 'standard',
        id: String(defaultModule.id || getStandardModuleIdByPageType(pageType)),
        version: Number(defaultModule.version || 1),
        overrides: {}
      },
      steps: []
    }
  } as ListeningChoiceQuestion
}

const page = ref<Page>('home')
const isListeningChoiceEditorReady = computed(() => Boolean(ListeningChoiceEditor))
const isPhonePreviewPanelReady = computed(() => Boolean(PhonePreviewPanel))
const activeFlowPageType = ref<FlowPageType>('listening_choice')
const defaultModule = getDefaultModule(activeFlowPageType.value)
const draftModuleId = ref(String(defaultModule.id || getStandardModuleIdByPageType(activeFlowPageType.value)))
const draftModuleVersion = ref(Number(defaultModule.version || 1))
const draftModuleName = ref(normalizeModuleName(defaultModule.name, getDefaultModuleNameByPageType(activeFlowPageType.value)))
const draftModuleNote = ref(normalizeModuleNote(defaultModule?.note))
const activeFlowDisplayName = computed(() => activeFlowPageType.value === 'speaking_hear_answer' ? '听后回答' : '听后选择')
const activeFlowSubtitle = computed(() => activeFlowPageType.value === 'speaking_hear_answer'
  ? '点击流程图节点，直接配置听后回答步骤规则'
  : '点击流程图节点，直接配置该步骤规则')
const activeEditorQuestionMode = computed<'choice' | 'hearAnswer'>(() => activeFlowPageType.value === 'speaking_hear_answer' ? 'hearAnswer' : 'choice')
const isRegionRoutingEnabled = computed(() => activeFlowPageType.value === 'listening_choice')
const flowNamePlaceholder = computed(() => activeFlowPageType.value === 'speaking_hear_answer'
  ? '例如：听后回答标准 / 北京-听后回答流程'
  : '例如：听后选择标准 / 广东-听后选择流程')
const flowWizardNamePlaceholder = computed(() => activeFlowPageType.value === 'speaking_hear_answer' ? '例如：听后回答-北京' : '例如：听后选择-北京')
const flowWizardNotePlaceholder = computed(() => activeFlowPageType.value === 'speaking_hear_answer' ? '例如：北京地区听后回答流程' : '例如：北京地区听后选择流程')
const readonlyFlowVisualVisible = ref(false)
const listeningChoiceDraft = ref<ListeningChoiceStandardFlowModuleV1>(clone(toDraftStandardModule(defaultModule)))
const draftModuleDisplayRef = computed(() => {
  const fallbackStandardId = getStandardModuleIdByPageType(activeFlowPageType.value)
  const id = String(draftModuleId.value || fallbackStandardId)
  const fallbackName = moduleNameFallbackById(id)
  const name = normalizeModuleName(draftModuleName.value, fallbackName)
  return name
})
const demoBase = computed<ListeningChoiceQuestion>({
  get() {
    return buildQuestionFromTemplate(activeFlowPageType.value)
  },
  set(next) {
    if (activeFlowPageType.value === 'speaking_hear_answer') {
      const fallback = normalizeListeningChoiceContentFromHearAnswer(contentTemplates.state.speakingHearAnswer.content)
      contentTemplates.setSpeakingHearAnswer({
        version: 1,
        content: normalizeSpeakingHearAnswerContentFromListening(clone(next?.content || fallback))
      })
      return
    }
    contentTemplates.setListeningChoice({
      version: 1,
      optionStyle: next?.optionStyle || 'ABCD',
      content: clone(next?.content || contentTemplates.state.listeningChoice.content)
    })
  }
})

const flowProfileRules = computed<FlowProfileV1[]>(() => {
  if (!isRegionRoutingEnabled.value) return []
  return flowProfiles.listByQuestionType('listening_choice')
})
const listeningChoiceModules = computed<ListeningChoiceFlowModuleV1[]>(() => {
  return (flowModules.listListeningChoice() || [])
    .filter((module) => isModuleIdMatchPageType(module?.id, activeFlowPageType.value))
})
const flowModuleRefOptions = computed(() => {
  return listeningChoiceModules.value.filter((m) => normalizeFlowModuleStatus(m?.status) === 'published')
})
type FlowLineOption = {
  id: string
  name: string
  status: FlowModuleStatus
  statusLabel: string
}

const flowLineOptions = computed<FlowLineOption[]>(() => {
  const groups = new Map<string, ListeningChoiceFlowModuleV1[]>()
  for (const module of listeningChoiceModules.value) {
    const id = String(module?.id || '')
    if (!id) continue
    const list = groups.get(id) || []
    list.push(module)
    groups.set(id, list)
  }

  const result: FlowLineOption[] = []
  groups.forEach((modules, id) => {
    const sorted = [...modules].sort((a, b) => Number(b.version || 0) - Number(a.version || 0))
    const preferred = sorted.find((item) => normalizeFlowModuleStatus(item?.status) !== 'archived') || sorted[0]
    if (!preferred) return
    const status = normalizeFlowModuleStatus(preferred.status)
    result.push({
      id,
      name: normalizeModuleName(preferred.name, moduleNameFallbackById(id)),
      status,
      statusLabel: formatFlowModuleStatusLabel(status)
    })
  })

  return result.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
})

function countFlowLinesByPageType(pageType: FlowPageType): number {
  const groups = new Set<string>()
  ;(flowModules.listListeningChoice() || []).forEach((module) => {
    const id = String(module?.id || '').trim()
    if (!id) return
    if (!isModuleIdMatchPageType(id, pageType)) return
    groups.add(id)
  })
  return groups.size
}

const listeningChoiceFlowLineCount = computed(() => countFlowLinesByPageType('listening_choice'))
const speakingHearAnswerFlowLineCount = computed(() => countFlowLinesByPageType('speaking_hear_answer'))
const REGION_FLOW_PROFILE_PRIORITY = 10
const REGION_GENERAL_LABEL = '通用'

type RegionRoutingBinding = {
  region: string
  module: FlowModuleRef
  note?: string
  id?: string
  createdAt?: string
  updatedAt?: string
}

const currentFlowLineRef = computed<FlowModuleRef>(() => ({
  id: String(draftModuleId.value || getStandardModuleIdByPageType(activeFlowPageType.value)),
  version: Math.max(1, toInt(draftModuleVersion.value || 1))
}))

function buildRegionProfileId(region: string): string {
  return `profile:listening_choice:region:${encodeURIComponent(region)}`
}

function isGeneralRegion(region: string): boolean {
  return normalizeNullableText(region) === REGION_GENERAL_LABEL
}

function readRegionTagOptions(): string[] {
  const roots = Array.isArray(tagStore.state.tree) ? tagStore.state.tree : []
  const regionRoot = roots.find((node) => normalizeNullableText((node as { title?: string })?.title) === '地区')
  const children = Array.isArray((regionRoot as { children?: Array<{ title?: string }> | undefined })?.children)
    ? (regionRoot as { children?: Array<{ title?: string }> }).children || []
    : []
  return children
    .map((item) => normalizeNullableText(item?.title))
    .filter((item): item is string => Boolean(item))
}

function getPublishedFallbackModuleRef(): FlowModuleRef {
  const fallback = flowModules.getListeningChoiceDefault()
  return {
    id: String(fallback?.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
    version: Math.max(1, toInt(fallback?.version || 1))
  }
}

function resolveActiveModuleRef(
  refLike: Partial<FlowModuleRef> | null | undefined,
  fallback: FlowModuleRef
): FlowModuleRef {
  const candidate = {
    id: String(refLike?.id || ''),
    version: Math.max(1, toInt(refLike?.version || 1))
  }
  if (candidate.id) {
    const hit = flowModules.getListeningChoiceByRef(candidate)
    if (hit && normalizeFlowModuleStatus(hit.status) !== 'archived') return candidate
  }
  return fallback
}

function collectRegionRoutingBindings(profiles: FlowProfileV1[]): RegionRoutingBinding[] {
  const sorted = [...(profiles || [])]
    .filter((profile) => profile?.enabled !== false)
    .sort((a, b) => {
      const pa = toInt(b?.priority || 0) - toInt(a?.priority || 0)
      if (pa !== 0) return pa
      const updatedCompare = String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || ''))
      if (updatedCompare !== 0) return updatedCompare
      return String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''))
    })

  const map = new Map<string, RegionRoutingBinding>()
  sorted.forEach((profile) => {
    const region = normalizeNullableText(profile?.region)
    if (!region) return
    if (isGeneralRegion(region)) return
    if (map.has(region)) return
    map.set(region, {
      region,
      module: {
        id: String(profile?.module?.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
        version: Math.max(1, toInt(profile?.module?.version || 1))
      },
      note: normalizeNullableText(profile?.note),
      id: String(profile?.id || buildRegionProfileId(region)),
      createdAt: profile?.createdAt,
      updatedAt: profile?.updatedAt
    })
  })

  return Array.from(map.values()).sort((a, b) => a.region.localeCompare(b.region, 'zh-Hans-CN'))
}

function buildRegionOnlyProfiles(
  currentProfiles: FlowProfileV1[],
  bindings: RegionRoutingBinding[],
  options: {
    defaultModuleRef?: FlowModuleRef
    defaultNote?: string
  } = {}
): FlowProfileV1[] {
  const now = new Date().toISOString()
  const fallbackModuleRef = getPublishedFallbackModuleRef()
  const defaultCandidate = (currentProfiles || []).find((profile) => {
    const region = normalizeNullableText(profile?.region)
    return !region || isGeneralRegion(region)
  })
  const defaultModuleRef = options.defaultModuleRef
    ? resolveActiveModuleRef(options.defaultModuleRef, fallbackModuleRef)
    : resolveActiveModuleRef(defaultCandidate?.module, fallbackModuleRef)

  const defaultProfile: FlowProfileV1 = {
    id: String(defaultCandidate?.id || 'profile:listening_choice:default'),
    questionType: 'listening_choice',
    region: undefined,
    scene: undefined,
    grade: undefined,
    module: defaultModuleRef,
    priority: 0,
    enabled: true,
    note: normalizeNullableText(options.defaultNote) || normalizeNullableText(defaultCandidate?.note) || '听后选择默认流程',
    createdAt: defaultCandidate?.createdAt || now,
    updatedAt: now
  }

  const regionProfiles = (bindings || []).map((binding) => {
    const region = normalizeNullableText(binding?.region) || ''
    const moduleRef = resolveActiveModuleRef(binding?.module, defaultModuleRef)
    return {
      id: String(binding?.id || buildRegionProfileId(region)),
      questionType: 'listening_choice' as const,
      region,
      scene: undefined,
      grade: undefined,
      module: moduleRef,
      priority: REGION_FLOW_PROFILE_PRIORITY,
      enabled: true,
      note: normalizeNullableText(binding?.note) || (isGeneralRegion(region) ? '地区未命中通用流程' : `${region}地区流程`),
      createdAt: binding?.createdAt || now,
      updatedAt: now
    } as FlowProfileV1
  })

  return [defaultProfile, ...regionProfiles]
}

function replaceRegionRoutingBindings(
  bindings: RegionRoutingBinding[],
  options: {
    defaultModuleRef?: FlowModuleRef
    defaultNote?: string
  } = {}
): boolean {
  if (!isRegionRoutingEnabled.value) return true
  const nextProfiles = buildRegionOnlyProfiles(flowProfileRules.value || [], bindings || [], options)
  const result = flowProfiles.replaceQuestionTypeProfiles('listening_choice', nextProfiles)
  if (!result.ok) {
    uni.showToast({ title: '地区匹配更新失败', icon: 'none' })
    return false
  }
  clearCommitValidationIssues()
  return true
}

function ensureRegionRoutingMode(_silent = true) {
  if (!isRegionRoutingEnabled.value) return true
  return true
}

const regionRoutingBindings = computed<RegionRoutingBinding[]>(() => {
  return collectRegionRoutingBindings(flowProfileRules.value || [])
})

const defaultRoutingProfile = computed<FlowProfileV1 | null>(() => {
  const profiles = flowProfileRules.value || []
  for (const profile of profiles) {
    if (profile?.enabled === false) continue
    const region = normalizeNullableText(profile?.region)
    if (!region || isGeneralRegion(region)) return profile
  }
  return null
})

const defaultRoutingModuleRef = computed<FlowModuleRef>(() => {
  return resolveActiveModuleRef(defaultRoutingProfile.value?.module, getPublishedFallbackModuleRef())
})

const {
  regionBindingOptions,
  isRegionBoundToCurrentFlowLine,
  formatRegionBindingTarget,
  toggleRegionBindingForCurrentFlowLine
} = useRegionBindingOverview({
  isRegionRoutingEnabled,
  regionRoutingBindings,
  defaultRoutingModuleRef,
  currentFlowLineRef,
  readRegionTagOptions,
  normalizeNullableText,
  isGeneralRegion,
  formatModuleDisplayRef,
  ensureRegionRoutingMode,
  replaceRegionRoutingBindings,
  buildRegionProfileId,
  getPublishedFallbackModuleRef
})

const {
  regionBindingTemplateName,
  regionBindingTemplateRows,
  saveRegionBindingTemplateFromCurrent,
  applyRegionBindingTemplate,
  removeRegionBindingTemplate
} = useRegionBindingTemplates({
  activeFlowDisplayName,
  isRegionRoutingEnabled,
  regionBindingOptions,
  regionRoutingBindings,
  defaultRoutingModuleRef,
  ensureRegionRoutingMode,
  replaceRegionRoutingBindings,
  buildRegionProfileId,
  isGeneralRegion,
  toInt,
  formatModuleDisplayRef
})

function getStandardBaselineModule(): ListeningChoiceFlowModuleV1 {
  const standardId = getStandardModuleIdByPageType(activeFlowPageType.value)
  const standard = flowModules.getListeningChoiceLatestPublished(standardId)
  return standard || getDefaultModule(activeFlowPageType.value)
}

function readCurrentFlowNameForWizard(): string {
  return normalizeModuleName(draftModuleName.value, getDefaultModuleNameByPageType(activeFlowPageType.value))
}

function performCreateFlowLine(payload: {
  name: string
  note: string
  baseline: 'current' | 'standard'
}): { ok: boolean; newFlowLineId?: string } {
  const nextId = buildUniqueFlowLineId(`${getFlowLineIdPrefixByPageType(activeFlowPageType.value)}.${Date.now()}`)
  const baselineDraft = payload.baseline === 'standard'
    ? clone(toDraftStandardModule(getStandardBaselineModule()))
    : clone(toDraftStandardModule({
      ...listeningChoiceDraft.value,
      id: draftModuleId.value,
      version: draftModuleVersion.value
    }))

  draftModuleId.value = nextId
  draftModuleVersion.value = 1
  draftModuleName.value = payload.name
  draftModuleNote.value = payload.note
  listeningChoiceDraft.value = clone(toDraftStandardModule({
    ...baselineDraft,
    id: nextId,
    version: 1
  }))
  readonlyFlowPartialPreviewRestoreOverride.value = undefined
  readonlyFlowPartialPreviewState.value = null
  visualPreviewOverrideSteps.value = null
  clearCommitValidationIssues()
  flowVisualEditor.clearDirty()
  flowVisualEditor.reloadFromQuestion()

  const saved = saveStandard(true, true, 1)
  if (!saved) return { ok: false }
  return { ok: true, newFlowLineId: nextId }
}

const {
  flowLineWizardVisible,
  flowLineWizardBaseline,
  flowLineWizardName,
  flowLineWizardNote,
  flowLineWizardRegions,
  canCreateFlowLineFromWizard,
  openFlowLineCreateWizard,
  closeFlowLineCreateWizard,
  isFlowLineWizardRegionSelected,
  toggleFlowLineWizardRegion,
  confirmCreateFlowLineFromWizard
} = useFlowLineWizard({
  activeFlowDisplayName,
  isRegionRoutingEnabled,
  regionRoutingBindings,
  readCurrentFlowNameForWizard,
  performCreateFlowLine,
  normalizeNullableText,
  isGeneralRegion,
  ensureRegionRoutingMode,
  replaceRegionRoutingBindings,
  buildRegionProfileId
})

function clearFlowCenterDiagnosticsTrace() {
  runtimeDebug.resetSession(flowCenterDebugSessionId, {
    keepMeta: true
  })
  syncFlowCenterDebugMeta()
  uni.showToast({ title: '已清空 trace', icon: 'none' })
}

function exportFlowCenterDiagnostics() {
  syncFlowCenterDebugMeta()
  const json = runtimeDebug.exportDiagnosticsJson(flowCenterDebugSessionId)
  if (!json) {
    uni.showToast({ title: '暂无可导出的 trace', icon: 'none' })
    return
  }

  uni.setClipboardData({
    data: json,
    success: () => {
      uni.showToast({ title: '诊断包已复制', icon: 'none' })
    }
  })
}

const {
  commitValidationIssues,
  activeCommitValidationIssueKey,
  templateFocusPath,
  normalizeCommitValidationIssue,
  clearCommitValidationIssues,
  jumpToCommitValidationIssue,
  jumpToFirstCommitValidationIssue,
  handleModuleCommitValidationFailed
} = useCommitValidationIssues({
  readonlyFlowVisualVisible,
  selectFlowVisualNode: (nodeId) => flowVisualEditor.selectNode(nodeId),
  formatFlowProfileLabelById
})

const commitValidationIssueList = computed(() => {
  const list = commitValidationIssues.value
  return Array.isArray(list) ? list : []
})

function normalizeNullableText(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function patchFlowProfile(id: string, patch: Record<string, unknown>) {
  const current = flowProfiles.getById(id)
  if (!current) return false
  const patchRecord = patch as Record<string, unknown>
  const patchModule = isObjectRecord(patchRecord.module) ? patchRecord.module : undefined
  const nextModule = patchModule ? { ...(current.module || {}), ...patchModule } : current.module
  const result = flowProfiles.upsertWithDiagnostics({
    ...current,
    ...patch,
    module: nextModule
  })
  if (!result.ok) {
    uni.showToast({ title: '更新路由失败', icon: 'none' })
    return false
  }
  return true
}

function buildCommitValidationFailureResult(
  rawIssues: Array<{ code?: string; path?: string; message?: string }>
): ModuleCommitValidationResult {
  const issues = (rawIssues || []).map((item, index) => normalizeCommitValidationIssue({
    code: item.code,
    path: item.path,
    message: item.message
  }, index))
  commitValidationIssues.value = issues
  activeCommitValidationIssueKey.value = issues[0]?.key || ''
  return {
    ok: false,
    errors: issues.map((item) => `${item.path}: ${item.message}`),
    issues: issues.map((item) => ({ code: item.code, path: item.path, message: item.message }))
  }
}

function validateModuleCommitBeforeSavePublish(payload: ModuleCommitValidationPayload): ModuleCommitValidationResult {
  const visualErrors = readonlyFlowCompileResult.value.errors || []
  if (visualErrors.length > 0) {
    return buildCommitValidationFailureResult(
      visualErrors.map((item) => ({
        code: `flow_visual_${item.code}`,
        path: `flowVisual.${item.path}`,
        message: `可视流程未通过线性编译：${item.message}`
      }))
    )
  }

  if (flowVisualEditor.dirty.value) {
    console.warn('[FlowModulesManager] commit blocked: visual graph dirty', flowVisualEditor.debugInfo.value)
    return buildCommitValidationFailureResult([
      {
        code: 'flow_visual_unapplied_changes',
        path: 'flowVisual.graph',
        message: '可视流程存在未应用变更，请先“应用到流程草稿”或“重置图”后再更新流程线。'
      }
    ])
  }

  const visualWarnings = readonlyFlowCompileResult.value.warnings || []
  if (payload.mode === 'publish' && visualWarnings.length > 0) {
    return buildCommitValidationFailureResult(
      visualWarnings.map((item) => ({
        code: `flow_visual_warning_${item.code}`,
        path: `flowVisual.${item.path}`,
        message: `发布前请处理可视流程提醒：${item.message}`
      }))
    )
  }

  const crossCheckProfiles = isRegionRoutingEnabled.value
    ? (flowProfileRules.value || [])
    : [{
        id: `profile:${activeFlowPageType.value}:default`,
        questionType: 'listening_choice' as const,
        region: undefined,
        scene: undefined,
        grade: undefined,
        module: {
          id: String(draftModuleId.value || getStandardModuleIdByPageType(activeFlowPageType.value)),
          version: Math.max(1, toInt(draftModuleVersion.value || 1))
        },
        priority: 0,
        enabled: true,
        note: `${activeFlowDisplayName.value}默认流程`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]
  const crossValidation = validateListeningChoiceModuleCommitCrossChecks({
    mode: payload.mode,
    template: demoBase.value,
    nextModule: payload.module,
    flowProfiles: crossCheckProfiles,
    moduleCatalog: flowModules.listListeningChoice()
  })
  if (crossValidation.ok) {
    clearCommitValidationIssues()
    return { ok: true, errors: [] }
  }
  return buildCommitValidationFailureResult((crossValidation.errors || []).map((item) => ({
    code: item.code,
    path: item.path,
    message: item.message
  })))
}

const moduleLifecycle = useModuleLifecycle({
  draftModuleId,
  draftModuleVersion,
  draftModuleName,
  draftModuleNote,
  draftModuleDisplayRef,
  listeningChoiceDraft,
  flowProfileRules,
  validateBeforeCommit: validateModuleCommitBeforeSavePublish,
  onCommitValidationFailed: handleModuleCommitValidationFailed
})
const {
  currentModuleStatus,
  currentModuleStatusLabel,
  currentModuleStatusHint,
  canSaveCurrentStandard
} = moduleLifecycle

function addFlowProfileRule() {
  const ts = Date.now()
  const result = flowProfiles.upsertWithDiagnostics({
    id: `profile:listening_choice:${ts}`,
    questionType: 'listening_choice',
    region: undefined,
    scene: undefined,
    grade: undefined,
    module: {
      id: draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID,
      version: Math.max(1, toInt(draftModuleVersion.value || 1))
    },
    priority: 0,
    enabled: true,
    note: `听后选择路由-${new Date(ts).toLocaleTimeString()}`
  })
  if (!result.ok) {
    uni.showToast({ title: '新增路由失败', icon: 'none' })
    return
  }
  uni.showToast({ title: '已新增路由', icon: 'success' })
}

function canRemoveFlowProfile(id: string) {
  if (flowProfileRules.value.length > 1) return true
  return id !== 'profile:listening_choice:default'
}

function removeFlowProfileRule(id: string) {
  if (!canRemoveFlowProfile(id)) {
    uni.showToast({ title: '至少保留一条路由', icon: 'none' })
    return
  }
  const result = flowProfiles.removeWithDiagnostics(id)
  if (!result.ok) {
    uni.showToast({ title: '删除失败', icon: 'none' })
    return
  }
  uni.showToast({ title: '已删除路由', icon: 'success' })
}

function resetFlowProfileRules() {
  uni.showModal({
    title: '重置路由',
    content: '将恢复听后选择默认路由规则。是否继续？',
    confirmText: '重置',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      flowProfiles.resetToDefault()
      uni.showToast({ title: '已重置路由', icon: 'success' })
    }
  })
}

function updateFlowProfileText(id: string, key: 'note' | 'region' | 'scene' | 'grade', value: string) {
  patchFlowProfile(id, { [key]: normalizeNullableText(value) })
}

function updateFlowProfilePriority(id: string, value: unknown) {
  const priority = toInt(value)
  patchFlowProfile(id, { priority })
}

function toggleFlowProfileEnabled(id: string) {
  const current = flowProfiles.getById(id)
  if (!current) return
  patchFlowProfile(id, { enabled: current.enabled === false })
}

function bindProfileToDraftModule(id: string) {
  const ok = patchFlowProfile(id, {
    module: {
      id: draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID,
      version: Math.max(1, toInt(draftModuleVersion.value || 1))
    }
  })
  if (!ok) return
  uni.showToast({ title: '已绑定当前流程线', icon: 'success' })
}

function bindProfileToModuleRef(id: string, ref: { id: string; version: number }) {
  patchFlowProfile(id, {
    module: {
      id: String(ref?.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
      version: Math.max(1, toInt(ref?.version || 1))
    }
  })
}

const visualPreviewOverrideSteps = ref<ListeningChoiceQuestion['flow']['steps'] | null>(null)
const hasVisualPreviewOverride = computed(() => {
  return Array.isArray(visualPreviewOverrideSteps.value) && visualPreviewOverrideSteps.value.length > 0
})

type FlowVisualPartialPreviewState = {
  nodeId: string
  stepKind: string
  logicalStepIndex: number
  groupId: string
  questionCount: number
  timerState: 'reset'
}

const readonlyFlowPartialPreviewState = ref<FlowVisualPartialPreviewState | null>(null)
const readonlyFlowPartialPreviewRestoreOverride = ref<ListeningChoiceQuestion['flow']['steps'] | null | undefined>(undefined)
const readonlyFlowPartialPreviewActive = computed(() => !!readonlyFlowPartialPreviewState.value)
let demoQuestionMaterializeErrorLogged = false
const readonlyFlowPartialPreviewLabel = computed(() => {
  const state = readonlyFlowPartialPreviewState.value
  if (!state) return ''
  return `局部预览模式 · 步骤 ${state.logicalStepIndex + 1}（${state.stepKind || '-'})`
})
const readonlyFlowPartialPreviewHint = computed(() => {
  const state = readonlyFlowPartialPreviewState.value
  if (!state) return ''
  const groupText = state.groupId ? `题组：${state.groupId}` : '题组：未绑定'
  const questionText = state.questionCount > 0 ? `题号数：${state.questionCount}` : '题号数：自动'
  return `${groupText} · ${questionText} · 计时状态：reset`
})

const demoQuestion = computed<ListeningChoiceQuestion>(() => {
  const base = demoBase.value
  const module = toDraftStandardModule({
    ...listeningChoiceDraft.value,
    id: draftModuleId.value,
    version: draftModuleVersion.value
  })
  let steps: ListeningChoiceQuestion['flow']['steps'] = []
  try {
    const materialized = materializeListeningChoiceStandardSteps(base, {
      generateId: makeStableIdFactory(),
      overrides: {},
      module
    })
    steps = Array.isArray(materialized) ? materialized as ListeningChoiceQuestion['flow']['steps'] : []
    demoQuestionMaterializeErrorLogged = false
  } catch (error) {
    if (!demoQuestionMaterializeErrorLogged) {
      console.error('[FlowModulesManager] Failed to materialize demo flow steps, fallback to base flow', error)
      demoQuestionMaterializeErrorLogged = true
    }
    const fallback = base?.flow?.steps
    steps = Array.isArray(fallback) ? clone(fallback) : []
  }
  const overrideSteps = visualPreviewOverrideSteps.value
  const effectiveSteps = Array.isArray(overrideSteps) && overrideSteps.length > 0 ? overrideSteps : steps
  return {
    ...base,
    flow: {
      ...base.flow,
      source: {
        kind: 'standard',
        id: draftModuleId.value,
        version: draftModuleVersion.value,
        overrides: {}
      },
      steps: effectiveSteps
    }
  }
})

function resolveReadonlyFlowMacroSnippet(ref: { baseId: string; version: number }) {
  const baseId = String(ref.baseId || '').trim()
  const version = Math.floor(Number(ref.version || 0))
  if (!baseId || version <= 0) return null
  const snippet = flowSnippets.getById(`${baseId}@v${version}`)
  if (!snippet) return null
  return {
    baseId: snippet.baseId,
    version: snippet.version,
    hash: snippet.hash,
    steps: snippet.steps
  }
}

const flowVisualEditor = useEditableFlowGraph(demoQuestion, {
  resolveMacroSnippet: resolveReadonlyFlowMacroSnippet
})
const flowVisualStencilItems = flowVisualEditor.stencilItems
const readonlyFlowSnippetSelectionAnchorId = flowVisualEditor.snippetSelectionAnchorId
const readonlyFlowSnippetSelectionNodeIds = flowVisualEditor.snippetSelectionNodeIds
const readonlyFlowVisualPropertyFields = flowVisualEditor.propertyFieldsForSelectedNode
const flowVisualDebugInfo = flowVisualEditor.debugInfo
const flowVisualDraggingKind = ref('')
const readonlyFlowGraph = flowVisualEditor.graph
const readonlyFlowCompileResult = flowVisualEditor.compileResult
const readonlyFlowCompiledStepPreview = flowVisualEditor.compiledStepPreview
const readonlyFlowQuickFixSuggestions = flowVisualEditor.quickFixSuggestions
const readonlyFlowLinearChecks = flowVisualEditor.linearConstraintChecks
const canReadonlyFlowVisualUndo = flowVisualEditor.canUndo
const canReadonlyFlowVisualRedo = flowVisualEditor.canRedo
const readonlyFlowRecentlyMovedNodeId = flowVisualEditor.recentlyMovedNodeId
const readonlyFlowVisualActiveNodeId = flowVisualEditor.selectedNodeId
const readonlyFlowVisualActiveNode = flowVisualEditor.selectedNode
const readonlyFlowSelectedMacroExpandedSteps = computed(() => {
  const activeNodeId = String(readonlyFlowVisualActiveNodeId.value || '').trim()
  if (!activeNodeId) return []
  const activeNode = readonlyFlowVisualActiveNode.value
  if (!activeNode || String(activeNode.data?.stepKind || '') !== 'macroNode') return []
  return (readonlyFlowCompileResult.value.steps || []).filter((item) => {
    return String(item?.id || '').startsWith(`${activeNodeId}::macro::`)
  })
})
const readonlyFlowVisualSnippets = computed(() => flowSnippets.listLatest(16))
const readonlyFlowSnippetSelectionLabel = computed(() => {
  const count = readonlyFlowSnippetSelectionNodeIds.value.length
  if (count <= 0) return '未选中步骤'
  if (count === 1) return '当前仅选中 1 步（可保存单步片段）'
  return `已框选 ${count} 步（起点 → 当前）`
})
const readonlyFlowVisualBulkFields = flowVisualEditor.bulkPropertyFieldsForSelection
const readonlyFlowVisualBulkSelectionCount = computed(() => readonlyFlowSnippetSelectionNodeIds.value.length)
const readonlyFlowVisualBulkPanelVisible = computed(() => {
  return readonlyFlowVisualBulkSelectionCount.value > 1 && readonlyFlowVisualBulkFields.value.length > 0
})
const readonlyFlowVisualBulkPatchDraft = ref<Partial<Record<FlowPropertyFieldKey, string>>>({})
const readonlyFlowVisualBulkPatchTouched = ref<Partial<Record<FlowPropertyFieldKey, boolean>>>({
  stepKind: false,
  autoNext: false,
  groupId: false
})
let flowVisualBodyOverflow = ''

function formatFlowVisualDebugTime(value: unknown) {
  const ms = Number(value || 0)
  if (!Number.isFinite(ms) || ms <= 0) return '-'
  try {
    return new Date(ms).toLocaleTimeString()
  } catch {
    return '-'
  }
}

function setFlowVisualBodyScrollLocked(locked: boolean) {
  if (typeof document === 'undefined') return
  const body = document.body
  if (!body) return
  if (locked) {
    flowVisualBodyOverflow = body.style.overflow || ''
    body.style.overflow = 'hidden'
    return
  }
  body.style.overflow = flowVisualBodyOverflow
}

function openReadonlyFlowVisual() {
  readonlyFlowVisualVisible.value = true
  flowVisualEditor.reloadFromQuestion()
  flowVisualEditor.clearSnippetSelectionAnchor()
  resetReadonlyFlowVisualBulkPatchDraft()
}

function closeReadonlyFlowVisual() {
  readonlyFlowVisualVisible.value = false
  flowVisualEditor.clearSnippetSelectionAnchor()
  resetReadonlyFlowVisualBulkPatchDraft()
}

function clearReadonlyFlowPartialPreviewMode() {
  const restore = readonlyFlowPartialPreviewRestoreOverride.value
  if (restore !== undefined) {
    visualPreviewOverrideSteps.value = restore ? clone(restore) : null
  }
  readonlyFlowPartialPreviewRestoreOverride.value = undefined
  readonlyFlowPartialPreviewState.value = null
  resetReadonlyFlowVisualBulkPatchDraft()
}

function resetReadonlyFlowVisualBulkPatchDraft() {
  readonlyFlowVisualBulkPatchDraft.value = {}
  readonlyFlowVisualBulkPatchTouched.value = {
    stepKind: false,
    autoNext: false,
    groupId: false
  }
}

function readReadonlyFlowVisualBulkFieldDraft(key: FlowPropertyFieldKey): string {
  return String(readonlyFlowVisualBulkPatchDraft.value[key] || '')
}

function setReadonlyFlowVisualBulkFieldDraft(key: FlowPropertyFieldKey, value: string) {
  readonlyFlowVisualBulkPatchDraft.value = {
    ...readonlyFlowVisualBulkPatchDraft.value,
    [key]: String(value || '')
  }
  readonlyFlowVisualBulkPatchTouched.value = {
    ...readonlyFlowVisualBulkPatchTouched.value,
    [key]: true
  }
}

function isReadonlyFlowVisualBulkFieldTouched(key: FlowPropertyFieldKey): boolean {
  return readonlyFlowVisualBulkPatchTouched.value[key] === true
}

function applyReadonlyFlowVisualBulkPatch() {
  if (!readonlyFlowVisualBulkPanelVisible.value) {
    uni.showToast({ title: '请先选择至少 2 个可批量编辑节点', icon: 'none' })
    return
  }

  const visibleKeySet = new Set(readonlyFlowVisualBulkFields.value.map((item) => item.key))
  const patch: FlowVisualNodePatch = {}
  let patchKeyCount = 0
  for (const key of readonlyFlowVisualBulkFields.value.map((item) => item.key)) {
    if (!visibleKeySet.has(key)) continue
    if (!isReadonlyFlowVisualBulkFieldTouched(key)) continue
    patch[key] = String(readonlyFlowVisualBulkPatchDraft.value[key] || '')
    patchKeyCount += 1
  }

  if (patchKeyCount <= 0) {
    uni.showToast({ title: '请先设置至少 1 个批量字段', icon: 'none' })
    return
  }

  const result = flowVisualEditor.patchSelectionRange(patch)
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' })
    return
  }

  resetReadonlyFlowVisualBulkPatchDraft()
  uni.showToast({ title: `已批量更新 ${result.updatedNodeCount} 个节点`, icon: 'none' })
}

function selectReadonlyFlowVisualNode(id: string) {
  flowVisualEditor.selectNode(id)
}

function addReadonlyFlowVisualStep(kind: string) {
  const result = flowVisualEditor.appendNode(kind)
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' })
  }
}

function reorderReadonlyFlowVisualNode(payload: { sourceId: string; targetId: string; position: 'before' | 'after' }) {
  flowVisualEditor.reorderNodes(payload.sourceId, payload.targetId, payload.position)
}

function insertReadonlyFlowVisualStepNearNode(payload: { kind: string; targetId: string; position: 'before' | 'after' }) {
  const result = flowVisualEditor.insertNodeNearTarget(payload.kind, payload.targetId, payload.position)
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' })
  }
}

function undoReadonlyFlowVisual() {
  flowVisualEditor.undo()
}

function redoReadonlyFlowVisual() {
  flowVisualEditor.redo()
}

function applyReadonlyFlowVisualQuickFix(key: string) {
  const applied = flowVisualEditor.applyQuickFixSuggestion(key)
  if (!applied) {
    uni.showToast({ title: '修复应用失败，请手动调整', icon: 'none' })
    return
  }
  uni.showToast({ title: '已应用修复建议', icon: 'none' })
}

function previewReadonlyFlowVisualFromNode(nodeId: string) {
  const targetNodeId = String(nodeId || '').trim()
  if (!targetNodeId) return
  if (!readonlyFlowCompileResult.value.ok) {
    uni.showToast({ title: '流程图不可编译，请先修复错误', icon: 'none' })
    return
  }

  const compiledSteps = readonlyFlowCompileResult.value.steps || []
  let logicalStepIndex = compiledSteps.findIndex((item) => String(item?.id || '') === targetNodeId)
  if (logicalStepIndex < 0) {
    logicalStepIndex = compiledSteps.findIndex((item) => String(item?.id || '').startsWith(`${targetNodeId}::macro::`))
  }
  if (logicalStepIndex < 0) {
    uni.showToast({ title: '目标节点未命中编译步骤', icon: 'none' })
    return
  }

  if (readonlyFlowPartialPreviewRestoreOverride.value === undefined) {
    const currentOverride = visualPreviewOverrideSteps.value
    readonlyFlowPartialPreviewRestoreOverride.value = currentOverride ? clone(currentOverride) : null
  }

  visualPreviewOverrideSteps.value = buildPreviewStepsFromVisual(compiledSteps)
  flowVisualEditor.selectNode(targetNodeId)

  const node = (readonlyFlowGraph.value.nodes || []).find((item) => item.id === targetNodeId)
  const compiledTargetStep = compiledSteps[logicalStepIndex]
  readonlyFlowPartialPreviewState.value = {
    nodeId: targetNodeId,
    stepKind: String(compiledTargetStep?.kind || node?.data?.stepKind || node?.kind || ''),
    logicalStepIndex,
    groupId: String(compiledTargetStep?.groupId || node?.data?.groupId || ''),
    questionCount: Math.max(0, toInt(node?.data?.questionCount || 0)),
    timerState: 'reset'
  }

  const nextVirtualIndex = firstVirtualIndexOfLogicalStep(logicalStepIndex)
  setPreviewVirtualIndex(nextVirtualIndex)
  configStepIndex.value = logicalStepIndex
  uni.showToast({ title: `已从第 ${logicalStepIndex + 1} 步开始预览`, icon: 'none' })
}

function formatFlowSnippetStepsText(steps: FlowSnippetTemplateStep[]): string {
  const list = Array.isArray(steps) ? steps : []
  if (list.length <= 0) return '-'
  return list
    .map((item) => String(item.kind || '').trim())
    .filter(Boolean)
    .join(' -> ')
}

function setReadonlyFlowVisualSnippetAnchor() {
  if (!readonlyFlowVisualActiveNodeId.value) {
    uni.showToast({ title: '请先选中一个节点作为起点', icon: 'none' })
    return
  }
  flowVisualEditor.setSnippetSelectionAnchor(readonlyFlowVisualActiveNodeId.value)
  uni.showToast({ title: '已设置片段起点', icon: 'none' })
}

function saveReadonlyFlowVisualSnippet() {
  const capture = flowVisualEditor.saveSnippetFromSelectionRange()
  if (!capture.ok) {
    uni.showToast({ title: capture.message, icon: 'none' })
    return
  }
  const saved = flowSnippets.saveSnippet({
    name: capture.suggestedName,
    steps: capture.steps
  })
  if (!saved) {
    uni.showToast({ title: '片段保存失败', icon: 'none' })
    return
  }
  uni.showToast({ title: `已保存片段 v${saved.version}`, icon: 'none' })
}

function applyReadonlyFlowVisualSnippet(
  snippetId: string,
  mode: 'after' | 'end' = 'after'
) {
  const snippet = flowSnippets.getById(snippetId)
  if (!snippet) {
    uni.showToast({ title: '片段不存在或已删除', icon: 'none' })
    return
  }
  const result = mode === 'end'
    ? flowVisualEditor.insertSnippetAtTail(snippet.steps)
    : flowVisualEditor.insertSnippetNearTarget(
      snippet.steps,
      readonlyFlowVisualActiveNodeId.value || '',
      'after'
    )
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' })
    return
  }
  uni.showToast({ title: '片段已插入', icon: 'none' })
}

function applyReadonlyFlowVisualSnippetAsMacro(
  snippetId: string,
  mode: 'after' | 'end' = 'after'
) {
  const snippet = flowSnippets.getById(snippetId)
  if (!snippet) {
    uni.showToast({ title: '片段不存在或已删除', icon: 'none' })
    return
  }

  const macroRef = {
    baseId: snippet.baseId,
    version: snippet.version,
    hash: snippet.hash,
    stepCount: snippet.steps.length
  }

  const result = mode === 'end'
    ? flowVisualEditor.insertMacroSnippetAtTail(macroRef)
    : flowVisualEditor.insertMacroSnippetNearTarget(
      macroRef,
      readonlyFlowVisualActiveNodeId.value || '',
      'after'
    )

  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' })
    return
  }
  uni.showToast({ title: '已按宏节点插入片段', icon: 'none' })
}

function onReadonlyFlowVisualDragStart(kind: string) {
  flowVisualDraggingKind.value = String(kind || '')
}

function onReadonlyFlowVisualDragEnd() {
  flowVisualDraggingKind.value = ''
}

function onReadonlyFlowVisualDrop(event: Event) {
  const drag = event as DragEvent
  const fromTransfer = drag.dataTransfer?.getData('text/flow-kind') || ''
  const kind = String(fromTransfer || flowVisualDraggingKind.value || '')
  if (!kind) return

  // Try to find the nearest node at the drop position to insert near it
  // instead of always appending to the end
  const targetInfo = resolveDropTargetFromDragEvent(drag)
  if (targetInfo) {
    const result = flowVisualEditor.insertNodeNearTarget(kind, targetInfo.nodeId, targetInfo.position)
    if (!result.ok) {
      uni.showToast({ title: result.message, icon: 'none' })
    }
  } else {
    const result = flowVisualEditor.appendNode(kind)
    if (!result.ok) {
      uni.showToast({ title: result.message, icon: 'none' })
    }
  }
  flowVisualDraggingKind.value = ''
}

function resolveDropTargetFromDragEvent(drag: DragEvent): { nodeId: string; position: 'before' | 'after' } | null {
  const clientX = drag.clientX
  const clientY = drag.clientY

  // Guard against non-finite coordinates which cause elementFromPoint to throw
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null
  }

  // Method 1: check if the drop landed on or near a flow node element
  if (typeof document !== 'undefined') {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    const nodeEl = el?.closest?.('[data-flow-node-id]') as HTMLElement | null
    if (nodeEl) {
      const nodeId = String(nodeEl.dataset.flowNodeId || '')
      if (nodeId) {
        const rect = nodeEl.getBoundingClientRect()
        const middle = rect.top + rect.height / 2
        const position: 'before' | 'after' = drag.clientY > middle ? 'after' : 'before'
        return { nodeId, position }
      }
    }
  }

  // Method 2: use the graph node positions to find the nearest node by Y coordinate
  const graphNodes = readonlyFlowGraph.value?.nodes || []
  if (graphNodes.length === 0) return null

  // Find the graph container element to get relative Y
  const graphContainer = typeof document !== 'undefined'
    ? document.querySelector('.readonly-flow-canvas__graph') as HTMLElement | null
    : null
  if (!graphContainer) return null

  const graphRect = graphContainer.getBoundingClientRect()
  const offsetY = drag.clientY - graphRect.top

  let bestNodeId = ''
  let bestPos: 'before' | 'after' = 'after'
  let minDist = Infinity

  for (const node of graphNodes) {
    const nodeMid = node.position.y + node.size.height / 2
    const dist = Math.abs(offsetY - nodeMid)
    if (dist < minDist) {
      minDist = dist
      bestNodeId = node.id
      bestPos = offsetY < nodeMid ? 'before' : 'after'
    }
  }

  return bestNodeId ? { nodeId: bestNodeId, position: bestPos } : null
}

function patchReadonlyFlowVisualNode(patch: FlowVisualNodePatch) {
  flowVisualEditor.patchSelectedNode(patch)
}

function removeReadonlyFlowVisualNode() {
  flowVisualEditor.removeSelectedNode()
}

function duplicateReadonlyFlowVisualNode() {
  flowVisualEditor.duplicateSelectedNode()
}

function selectReadonlyFlowVisualPrevNode() {
  flowVisualEditor.selectPrevNode()
}

function selectReadonlyFlowVisualNextNode() {
  flowVisualEditor.selectNextNode()
}

function readFlowVisualIssueNodeId(issuePath: string): string {
  const text = String(issuePath || '')
  const match = text.match(/graph\.nodes\(([^)]+)\)/)
  if (!match) return ''
  const raw = String(match[1] || '')
  const macroPrefix = raw.split('::macro::')[0]
  return macroPrefix || raw
}

function readFlowVisualCompiledStepNodeId(stepId: string): string {
  const raw = String(stepId || '').trim()
  if (!raw) return ''
  const macroPrefix = raw.split('::macro::')[0]
  const nodes = readonlyFlowGraph.value.nodes || []
  if (nodes.some((node) => node.id === macroPrefix)) return macroPrefix
  if (nodes.some((node) => node.id === raw)) return raw
  return macroPrefix || raw
}

function locateReadonlyFlowVisualCompiledStep(stepId: string) {
  const nodeId = readFlowVisualCompiledStepNodeId(stepId)
  if (!nodeId) return
  flowVisualEditor.selectNode(nodeId)
}

function formatReadonlyFlowCompiledStepLine(item: VisualLinearStep, index: number): string {
  const stepId = String(item?.id || '')
  const sourceNodeId = readFlowVisualCompiledStepNodeId(stepId)
  const isMacroExpanded = stepId.includes('::macro::')
  const sourceText = sourceNodeId
    ? (isMacroExpanded ? `来源宏节点 ${sourceNodeId}` : `来源节点 ${sourceNodeId}`)
    : '来源未知'
  return `步骤 ${index + 1} · ${item.kind} · ${item.autoNext || 'manual'} · ${sourceText}`
}

function locateReadonlyFlowVisualIssue(issuePath: string) {
  const nodeId = readFlowVisualIssueNodeId(issuePath)
  if (!nodeId) return
  flowVisualEditor.selectNode(nodeId)
}

function isTextEditingElement(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false
  const el = target as HTMLElement
  const tag = String(el.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (el.isContentEditable) return true
  return false
}

function onFlowVisualKeydown(event: KeyboardEvent) {
  if (!readonlyFlowVisualVisible.value) return
  if (isTextEditingElement(event.target)) return
  const lower = String(event.key || '').toLowerCase()
  const mod = event.metaKey || event.ctrlKey
  if (mod && !event.altKey) {
    if (lower === 'z' && event.shiftKey) {
      if (!canReadonlyFlowVisualRedo.value) return
      event.preventDefault()
      redoReadonlyFlowVisual()
      return
    }
    if (lower === 'y') {
      if (!canReadonlyFlowVisualRedo.value) return
      event.preventDefault()
      redoReadonlyFlowVisual()
      return
    }
    if (lower === 'z') {
      if (!canReadonlyFlowVisualUndo.value) return
      event.preventDefault()
      undoReadonlyFlowVisual()
      return
    }
    if (lower === 'd') {
      if (!readonlyFlowVisualActiveNode.value) return
      event.preventDefault()
      duplicateReadonlyFlowVisualNode()
      return
    }
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectReadonlyFlowVisualPrevNode()
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectReadonlyFlowVisualNextNode()
    return
  }
  const key = String(event.key || '')
  if (key !== 'Delete' && key !== 'Backspace') return
  if (!readonlyFlowVisualActiveNode.value) return
  event.preventDefault()
  removeReadonlyFlowVisualNode()
}

function moveReadonlyFlowVisualNodeUp() {
  flowVisualEditor.moveSelectedNodeUp()
}

function moveReadonlyFlowVisualNodeDown() {
  flowVisualEditor.moveSelectedNodeDown()
}

function resetReadonlyFlowVisualFromQuestion() {
  flowVisualEditor.reloadFromQuestion()
}

function buildPreviewStepsFromVisual(compiledSteps: VisualLinearStep[]): ListeningChoiceQuestion['flow']['steps'] {
  const groups = demoBase.value?.content?.groups || []
  const firstGroupId = String(groups[0]?.id || 'group_1')
  const firstPrepareSeconds = Math.max(0, toInt(groups[0]?.prepareSeconds || 0))
  return (compiledSteps || []).map((item, index) => {
    return buildPreviewFlowStepFromVisual(item, index, firstGroupId, firstPrepareSeconds)
  })
}

function applyReadonlyFlowVisualToPreview() {
  if (!readonlyFlowCompileResult.value.ok) {
    uni.showToast({ title: '流程图不可编译，请先修复错误', icon: 'none' })
    return
  }
  readonlyFlowPartialPreviewRestoreOverride.value = undefined
  readonlyFlowPartialPreviewState.value = null
  visualPreviewOverrideSteps.value = buildPreviewStepsFromVisual(readonlyFlowCompileResult.value.steps)
  uni.showToast({ title: '已应用到预览', icon: 'success' })
}

function clearReadonlyFlowVisualPreviewOverride() {
  readonlyFlowPartialPreviewRestoreOverride.value = undefined
  readonlyFlowPartialPreviewState.value = null
  visualPreviewOverrideSteps.value = null
  uni.showToast({ title: '已清除预览覆盖', icon: 'none' })
}

function formatVisualMapperIssues(lines: Array<{ message: string }>, max = 6): string {
  if (!Array.isArray(lines) || lines.length <= 0) return ''
  const head = lines.slice(0, max).map((item, index) => `${index + 1}. ${item.message}`)
  if (lines.length > max) head.push(`... 另有 ${lines.length - max} 条`)
  return head.join('\n')
}

function formatTextBlockForModal(text: string, maxLines = 14): string {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length <= maxLines) return lines.join('\n')
  return `${lines.slice(0, maxLines).join('\n')}\n... 另有 ${lines.length - maxLines} 行`
}

function applyReadonlyFlowVisualToDraft() {
  if (!readonlyFlowCompileResult.value.ok) {
    uni.showToast({ title: '流程图不可编译，请先修复错误', icon: 'none' })
    return
  }

  const firstGroup = demoBase.value?.content?.groups?.[0]
  const mapperResult = buildListeningChoiceModuleFromLinearSteps(readonlyFlowCompileResult.value.steps, {
    baseModule: listeningChoiceDraft.value,
    defaultCountdownSeconds: Math.max(0, toInt(firstGroup?.prepareSeconds || 0)),
    defaultCountdownLabel: '准备'
  })

  if (!mapperResult.ok) {
    uni.showModal({
      title: '映射到流程草稿失败',
      content: formatVisualMapperIssues(mapperResult.errors) || '请检查流程图配置后重试。',
      showCancel: false
    })
    return
  }

  const nextDraft = clone(toDraftStandardModule({
    ...mapperResult.module,
    id: draftModuleId.value,
    version: draftModuleVersion.value
  }))
  const diffSummary = buildModuleDiffSummary({
    previousModule: listeningChoiceDraft.value,
    nextModule: nextDraft
  })
  const diffText = formatTextBlockForModal(formatModuleDiffSummary(diffSummary), 12)

  const applyDraft = () => {
    listeningChoiceDraft.value = nextDraft

    const validation = validateListeningChoiceStandardModule({
      ...listeningChoiceDraft.value,
      id: draftModuleId.value,
      version: draftModuleVersion.value
    })

    if (!validation.ok) {
      const validationText = formatVisualMapperIssues(validation.errors)
      uni.showModal({
        title: '流程草稿仍有错误',
        content: validationText || '请继续调整流程配置。',
        showCancel: false
      })
      return
    }

    readonlyFlowPartialPreviewRestoreOverride.value = undefined
    readonlyFlowPartialPreviewState.value = null
    visualPreviewOverrideSteps.value = null
    clearCommitValidationIssues()
    flowVisualEditor.clearDirty()
    flowVisualEditor.reloadFromQuestion()
    const warningCount = mapperResult.warnings.length + validation.warnings.length
    if (warningCount > 0) {
      uni.showToast({ title: `已应用到流程草稿（${warningCount} 条提醒）`, icon: 'none' })
      return
    }
    uni.showToast({ title: '已应用到流程草稿', icon: 'success' })
  }

  const mapperWarnings = formatVisualMapperIssues(mapperResult.warnings)
  const warningBlock = mapperWarnings ? `\n\n映射提醒：\n${mapperWarnings}` : ''
  const content = `将把可视流程回写到当前草稿。\n\n差异摘要：\n${diffText}${warningBlock}\n\n是否继续应用？`

  uni.showModal({
    title: '应用到流程草稿',
    content,
    confirmText: '继续应用',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      applyDraft()
    }
  })
}

type ListeningChoiceFlowStep = ListeningChoiceQuestion['flow']['steps'][number]
type FlowPreviewGroup = ListeningChoiceContent['groups'][number] | SpeakingHearAnswerContent['groups'][number]

function buildPreviewGroupMap(groups: FlowPreviewGroup[]): Map<string, FlowPreviewGroup> {
  return new Map(groups.map((g) => [String(g.id || ''), g] as const))
}

function normalizePreviewReplayGapSeconds(step: ListeningChoiceFlowStep, groupById: Map<string, FlowPreviewGroup>): number {
  if (step.kind !== 'playAudio' || step.audioSource !== 'content') return 0
  const rawGap = step.repeatGapSeconds
  if (typeof rawGap === 'number' && Number.isFinite(rawGap)) return Math.max(0, Math.floor(rawGap))
  const group = groupById.get(String(step.groupId || ''))
  return Math.max(0, toInt(group?.prepareSeconds || 3))
}

function resolvePreviewAudioPlayCount(step: ListeningChoiceFlowStep, groupById: Map<string, FlowPreviewGroup>): number {
  const explicit = Math.floor(Number((step as unknown as { playTimes?: unknown }).playTimes))
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.max(1, explicit)
  }

  if (step.kind === 'intro') {
    return Math.max(1, toInt(demoQuestion.value.content?.intro?.audio?.playCount || 1))
  }
  if (step.kind !== 'playAudio') return 1
  const group = groupById.get(String(step.groupId || ''))
  if (step.audioSource === 'description') {
    return Math.max(1, toInt(group?.descriptionAudio?.playCount || 1))
  }
  return Math.max(1, toInt(group?.audio?.playCount || 1))
}

function buildPreviewReplayGapStep(baseStep: ListeningChoiceFlowStep, replayIndex: number, seconds: number): ListeningChoiceFlowStep {
  if (baseStep.kind !== 'playAudio') return baseStep
  return {
    id: `${String(baseStep.id || 'step')}_gap_${replayIndex}`,
    kind: 'countdown',
    showTitle: false,
    seconds: Math.max(0, seconds),
    label: '正文重播间隔',
    autoNext: 'countdownEnded'
  }
}

function clonePreviewStepForReplay(step: ListeningChoiceFlowStep, replayIndex: number): ListeningChoiceFlowStep {
  return {
    ...step,
    id: `${String(step.id || 'step')}_rep_${replayIndex}`
  }
}

const previewTotalSteps = computed(() => Number(demoQuestion.value.flow?.steps?.length || 0))
const previewExpandedSegments = computed<Array<number>>(() => {
  const steps = demoQuestion.value.flow?.steps || []
  const groups = (demoQuestion.value.content?.groups || []) as FlowPreviewGroup[]
  const groupById = buildPreviewGroupMap(groups)
  const out: number[] = []
  steps.forEach((step, logicalIndex) => {
    const playCount = resolvePreviewAudioPlayCount(step, groupById)
    if (playCount <= 1 || (step.kind !== 'intro' && step.kind !== 'playAudio')) {
      out.push(logicalIndex)
      return
    }

    if (step.kind === 'intro') {
      for (let i = 1; i <= playCount; i += 1) out.push(logicalIndex)
      return
    }

    const gapSeconds = normalizePreviewReplayGapSeconds(step, groupById)
    for (let i = 1; i <= playCount; i += 1) {
      out.push(logicalIndex)
      if (i < playCount && gapSeconds > 0) out.push(logicalIndex)
    }
  })
  return out
})

const {
  previewAnswers,
  showAnswer,
  previewVirtualIndex,
  currentStepIndex,
  configStepIndex,
  previewDisplayTotalSteps,
  previewDisplayStepIndex,
  firstVirtualIndexOfLogicalStep,
  setPreviewVirtualIndex,
  jumpToStep: jumpToStepCore,
  syncConfigStepToCurrent,
  onPreviewStepChange: onPreviewStepChangeCore,
  onPreviewSelect: onPreviewSelectCore,
  resetFlowPreviewPanel
} = useFlowPreviewPanel({
  demoQuestion,
  previewTotalSteps,
  previewExpandedSegments
})

const previewRenderQuestion = computed<ListeningChoiceQuestion>(() => {
  const base = demoQuestion.value
  const steps = base.flow?.steps || []
  const groups = (base.content?.groups || []) as FlowPreviewGroup[]
  const groupById = buildPreviewGroupMap(groups)
  const expandedSteps: ListeningChoiceQuestion['flow']['steps'] = []
  steps.forEach((step) => {
    const playCount = resolvePreviewAudioPlayCount(step, groupById)
    if (playCount <= 1 || (step.kind !== 'intro' && step.kind !== 'playAudio')) {
      expandedSteps.push({ ...step })
      return
    }

    if (step.kind === 'intro') {
      for (let i = 1; i <= playCount; i += 1) {
        expandedSteps.push(clonePreviewStepForReplay(step, i))
      }
      return
    }

    const gapSeconds = normalizePreviewReplayGapSeconds(step, groupById)
    for (let i = 1; i <= playCount; i += 1) {
      expandedSteps.push(clonePreviewStepForReplay(step, i))
      if (i < playCount && gapSeconds > 0) {
        expandedSteps.push(buildPreviewReplayGapStep(step, i, gapSeconds))
      }
    }
  })

  return {
    ...base,
    flow: {
      ...base.flow,
      steps: expandedSteps
    }
  }
})

const flowCenterDebugSessionId = 'flow_center:listening_choice'
const flowCenterTraceEvents = computed<RuntimeDebugEvent[]>(() => {
  return runtimeDebug.getSession(flowCenterDebugSessionId)?.events || []
})
const flowCenterCurrentStep = computed<ListeningChoiceFlowStep | null>(() => {
  const steps = demoQuestion.value.flow?.steps || []
  if (steps.length <= 0) return null
  const idx = Math.max(0, Math.min(currentStepIndex.value, steps.length - 1))
  return steps[idx] || null
})
const flowCenterCurrentStepKind = computed(() => String(flowCenterCurrentStep.value?.kind || '-'))
const flowCenterCurrentStepText = computed(() => {
  if (previewDisplayTotalSteps.value <= 0) return '-'
  return `${previewDisplayStepIndex.value}/${previewDisplayTotalSteps.value}（${flowCenterCurrentStepKind.value}）`
})
const flowCenterAutoNextCode = computed(() => String(flowCenterCurrentStep.value?.autoNext || ''))
const flowCenterAutoNextReasonText = computed(() => formatAutoNextReason(flowCenterAutoNextCode.value))
const flowCenterHitModuleVersionText = computed(() => {
  return formatModuleDisplayRef(currentFlowLineRef.value)
})
const flowCenterRouteSignature = computed(() => {
  const moduleId = String(currentFlowLineRef.value.id || '-')
  const moduleVersion = String(currentFlowLineRef.value.version || 0)
  const profileCount = String((flowProfileRules.value || []).length)
  return [moduleId, moduleVersion, profileCount].join('|')
})
const flowCenterStepSignature = computed(() => {
  return [
    String(currentStepIndex.value),
    flowCenterCurrentStepKind.value,
    flowCenterAutoNextCode.value,
    String(previewDisplayTotalSteps.value),
    String(previewDisplayStepIndex.value)
  ].join('|')
})

function syncFlowCenterDebugMeta() {
  runtimeDebug.ensureSession(flowCenterDebugSessionId, {
    mode: 'flow_center',
    questionId: String(demoQuestion.value?.id || ''),
    questionType: String(demoQuestion.value?.type || 'listening_choice'),
    sourceKind: 'flow_center',
    profileId: '',
    moduleId: String(currentFlowLineRef.value.id || ''),
    moduleDisplayRef: flowCenterHitModuleVersionText.value,
    moduleVersionText: `v${Math.max(1, toInt(currentFlowLineRef.value.version || 1))}`,
    moduleNote: String(draftModuleNote.value || ''),
    currentStep: flowCenterCurrentStepText.value,
    currentStepKind: flowCenterCurrentStepKind.value,
    autoNext: flowCenterAutoNextCode.value || '-',
    autoNextReason: flowCenterAutoNextReasonText.value,
    ctx: {}
  })
}

onMounted(() => {
  syncFlowCenterDebugMeta()
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onFlowVisualKeydown)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onFlowVisualKeydown)
  }
  setFlowVisualBodyScrollLocked(false)
})

watch(readonlyFlowVisualVisible, (visible) => {
  setFlowVisualBodyScrollLocked(visible)
  if (!visible) resetReadonlyFlowVisualBulkPatchDraft()
})

watch(readonlyFlowVisualBulkPanelVisible, (visible, prev) => {
  if (visible === prev) return
  resetReadonlyFlowVisualBulkPatchDraft()
})

watch(() => readonlyFlowVisualBulkFields.value.map((item) => item.key).join('|'), (next, prev) => {
  if (next === prev) return
  resetReadonlyFlowVisualBulkPatchDraft()
})

watch(flowCenterRouteSignature, (next, prev) => {
  syncFlowCenterDebugMeta()
  if (!next || next === prev) return
  runtimeDebug.record(flowCenterDebugSessionId, {
    type: 'route',
    message: `当前流程线：${flowCenterHitModuleVersionText.value}`,
    payload: {
      moduleId: String(currentFlowLineRef.value.id || ''),
      moduleVersion: currentFlowLineRef.value.version || 0,
      ruleCount: (flowProfileRules.value || []).length
    }
  })
}, { immediate: true })

watch(flowCenterStepSignature, (next, prev) => {
  syncFlowCenterDebugMeta()
  if (!next || next === prev) return
  runtimeDebug.record(flowCenterDebugSessionId, {
    type: 'step',
    message: `当前 step：${flowCenterCurrentStepText.value}，autoNext 原因：${flowCenterAutoNextReasonText.value}`,
    payload: {
      stepIndex: currentStepIndex.value,
      stepKind: flowCenterCurrentStepKind.value,
      autoNext: flowCenterAutoNextCode.value
    }
  })
}, { immediate: true })

const perGroupEditor = usePerGroupStepEditor({
  demoQuestion,
  listeningChoiceDraft,
  currentStepIndex,
  configStepIndex
})
const {
  introShowTitle,
  introShowTitleDescription,
  introShowDescription,
  introCountdownEnabled,
  introCountdownShowTitle,
  introCountdownSeconds,
  introCountdownLabel,
  flowQuickAddItems,
  selectedConfig,
  selectedStepLabel,
  reorderableFlowIndices,
  toggleIntroBool,
  patchIntroCountdown,
  getPerGroupRaw,
  getPerGroupAudioSource,
  getPerGroupRepeatGapSeconds,
  isPerGroupReplayGapEnabled,
  getPerGroupBool,
  supportsPerGroupField,
  patchPerGroupStep,
  setPerGroupAudioSource,
  setPerGroupRepeatGapSeconds,
  togglePerGroupReplayGap,
  togglePerGroupBool
} = perGroupEditor

function enableIntroCountdown() {
  perGroupEditor.enableIntroCountdown()
}

function disableIntroCountdown() {
  perGroupEditor.disableIntroCountdown()
}

function quickAddPerGroupStep(kind: QuickAddPerGroupKind) {
  perGroupEditor.quickAddPerGroupStep(kind)
}

function removePerGroupStep(index: number) {
  perGroupEditor.removePerGroupStep(index)
}

function reorderPerGroupStepByFlowIndex(fromFlowIndex: number, toFlowIndex: number) {
  perGroupEditor.reorderPerGroupStepByFlowIndex(fromFlowIndex, toFlowIndex)
}

function onFlowQuickAdd(kind: string) {
  if (kind === 'introCountdown') {
    enableIntroCountdown()
    return
  }
  if (kind === 'playAudioDescription') {
    quickAddPerGroupStep('playAudioDescription')
    return
  }
  if (kind === 'playAudioContent') {
    quickAddPerGroupStep('playAudioContent')
    return
  }
  if (kind === 'countdown') {
    quickAddPerGroupStep('countdown')
    return
  }
  if (kind === 'promptTone') {
    quickAddPerGroupStep('promptTone')
    return
  }
  if (kind === 'recordGuide') {
    quickAddPerGroupStep('recordGuide')
    return
  }
  if (kind === 'answerChoice') {
    quickAddPerGroupStep('answerChoice')
  }
}

function getRecordGuideTextSource(index: number): 'question' | 'group' {
  const raw = String(getPerGroupRaw(index, 'textSource') || '').trim()
  return raw === 'group' ? 'group' : 'question'
}

function setRecordGuideTextSource(index: number, value: 'question' | 'group') {
  patchPerGroupStep(index, { textSource: value })
}

function getRecordGuideAudioSource(index: number): 'question' | 'group' | 'fixed' {
  const raw = String(getPerGroupRaw(index, 'audioSource') || '').trim()
  if (raw === 'group') return 'group'
  if (raw === 'fixed') return 'fixed'
  return 'question'
}

function setRecordGuideAudioSource(index: number, value: 'question' | 'group' | 'fixed') {
  patchPerGroupStep(index, { audioSource: value })
}

function getRecordGuideScreenStrategy(index: number): 'replaceBody' | 'reusePrevious' {
  const raw = String(getPerGroupRaw(index, 'screenStrategy') || '').trim()
  return raw === 'reusePrevious' ? 'reusePrevious' : 'replaceBody'
}

function setRecordGuideScreenStrategy(index: number, value: 'replaceBody' | 'reusePrevious') {
  patchPerGroupStep(index, { screenStrategy: value })
}

function syncDraftModuleMeta(module: unknown) {
  const mod = isObjectRecord(module) ? module : {}
  const id = String(mod.id || getStandardModuleIdByPageType(activeFlowPageType.value))
  draftModuleName.value = normalizeModuleName(mod.name, moduleNameFallbackById(id))
  draftModuleNote.value = normalizeModuleNote(mod.note)
}

function buildUniqueFlowLineId(baseId: string): string {
  const fallbackPrefix = getFlowLineIdPrefixByPageType(activeFlowPageType.value)
  const normalizedBaseId = String(baseId || '').trim() || `${fallbackPrefix}.${Date.now()}`
  const existingIds = new Set(
    (listeningChoiceModules.value || []).map((module) => String(module?.id || '')).filter(Boolean)
  )
  if (!existingIds.has(normalizedBaseId)) return normalizedBaseId

  let suffix = 2
  let candidate = `${normalizedBaseId}.${suffix}`
  while (existingIds.has(candidate)) {
    suffix += 1
    candidate = `${normalizedBaseId}.${suffix}`
  }
  return candidate
}

function clearPreviewOverrides() {
  readonlyFlowPartialPreviewRestoreOverride.value = undefined
  readonlyFlowPartialPreviewState.value = null
  visualPreviewOverrideSteps.value = null
}

function syncFlowVisualAfterDraftSwitch() {
  flowVisualEditor.clearDirty()
  flowVisualEditor.reloadFromQuestion()
}

const {
  switchDraftToModuleRef,
  switchToFlowLine
} = useFlowLineSwitcher({
  activeFlowPageType,
  listeningChoiceModules,
  draftModuleId,
  draftModuleVersion,
  listeningChoiceDraft,
  getStandardModuleIdByPageType,
  toInt,
  normalizeFlowModuleStatus,
  getListeningChoiceByRef: (ref) => flowModules.getListeningChoiceByRef(ref),
  syncDraftModuleMeta,
  toDraftStandardModule,
  clone,
  clearPreviewOverrides,
  clearCommitValidationIssues,
  syncFlowVisualAfterDraftSwitch,
  showToast: (title) => {
    uni.showToast({ title, icon: 'none' })
  }
})

let lastFlowLineChipSwitchTs = 0
let lastFlowLineChipSwitchId = ''
function onFlowLineChipActivate(lineId: string) {
  const id = String(lineId || '').trim()
  if (!id) return
  const now = Date.now()
  if (id === lastFlowLineChipSwitchId && now - lastFlowLineChipSwitchTs < 180) return
  lastFlowLineChipSwitchId = id
  lastFlowLineChipSwitchTs = now
  switchToFlowLine(id)
}

const {
  goHome,
  openListeningChoice,
  openSpeakingHearAnswer
} = useFlowPageNavigation({
  page,
  activeFlowPageType,
  flowLineWizardVisible,
  draftModuleId,
  draftModuleVersion,
  listeningChoiceDraft,
  listeningChoiceStandardFlowId: LISTENING_CHOICE_STANDARD_FLOW_ID,
  listeningHearAnswerStandardFlowId: LISTENING_HEAR_ANSWER_STANDARD_FLOW_ID,
  ensureRegionRoutingMode,
  syncTemplateFromLibraryQuestion,
  getDefaultModule,
  syncDraftModuleMeta,
  toDraftStandardModule,
  clone,
  clearPreviewOverrides,
  resetFlowPreviewPanel
})

function reloadDemoBaseFromTemplate() {
  const synced = syncTemplateFromLibraryQuestion(activeFlowPageType.value)
  clearPreviewOverrides()
  resetFlowPreviewPanel()
  if (synced) {
    uni.showToast({ title: '已同步题库测试题', icon: 'none' })
    return
  }
  uni.showToast({ title: '未找到题库测试题，已使用题型模板', icon: 'none' })
}

function toastWip(name: string) {
  uni.showToast({ title: `${name}：开发中`, icon: 'none' })
}

function showPublishLogs() {
  moduleLifecycle.showPublishLogs()
}

function saveStandard(skipWarningCheck = false, skipImpactCheck = false, targetVersion?: number): boolean {
  return moduleLifecycle.saveStandard(skipWarningCheck, skipImpactCheck, targetVersion)
}

function updateCurrentFlowLine(skipWarningCheck = false, skipImpactCheck = false): boolean {
  const targetVersion = Math.max(1, toInt(draftModuleVersion.value || 1))
  return saveStandard(skipWarningCheck, skipImpactCheck, targetVersion)
}

function saveStandardAsNextVersion(): boolean {
  return moduleLifecycle.saveStandardAsNextVersion()
}

function publishCurrentStandard(skipWarningCheck = false, skipImpactCheck = false): boolean {
  return moduleLifecycle.publishCurrentStandard(skipWarningCheck, skipImpactCheck)
}

function archiveCurrentStandard() {
  moduleLifecycle.archiveCurrentStandard()
}

function resetStandard() {
  moduleLifecycle.resetStandard()
}

function applyStandardToCurrentQuestion() {
  try {
    const data = getCurrentQuestionSnapshot()
    if (!data) {
      uni.showToast({ title: '当前没有题目', icon: 'none' })
      return
    }

    const expectedType = activeFlowPageType.value === 'speaking_hear_answer'
      ? 'speaking_hear_answer'
      : 'listening_choice'
    if (data?.type !== expectedType) {
      uni.showToast({ title: `当前题目不是${activeFlowDisplayName.value}`, icon: 'none' })
      return
    }

    const module = toDraftStandardModule({
      ...listeningChoiceDraft.value,
      id: draftModuleId.value,
      version: draftModuleVersion.value
    })
    const steps = materializeListeningChoiceStandardSteps(data, { generateId, overrides: {}, module })

    const next = patchListeningChoiceQuestionFlow(
      data as ListeningChoiceQuestion | SpeakingHearAnswerQuestion,
      {
        kind: 'standard',
        id: draftModuleId.value,
        version: draftModuleVersion.value,
        overrides: {}
      },
      steps
    )

    persistCurrentQuestion(next)
    appShell.switchModule('editor')
    uni.showToast({ title: '已套用题型流程', icon: 'success' })
  } catch (e) {
    console.error('Failed to apply standard flow', e)
    uni.showToast({ title: '套用失败', icon: 'none' })
  }
}

function jumpToStep(index: number) {
  jumpToStepCore(index)
}

function previewPrevStep() {
  setPreviewVirtualIndex(previewVirtualIndex.value - 1)
  syncConfigStepToCurrent()
}

function previewNextStep() {
  setPreviewVirtualIndex(previewVirtualIndex.value + 1)
  syncConfigStepToCurrent()
}

function onPreviewStepChange(step: number) {
  onPreviewStepChangeCore(step)
}

function onPreviewSelect(subQuestionId: string, optionKey: string) {
  onPreviewSelectCore(subQuestionId, optionKey)
}
</script>

<style src="./flow-modules/FlowModulesManager.scss" lang="scss" scoped></style>
