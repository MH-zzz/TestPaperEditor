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
            <text class="title">听后选择</text>
            <text class="subtitle">点击流程图节点，直接配置该步骤规则</text>
          </view>
        </template>
      </view>

      <view class="header-right">
        <template v-if="page === 'listening_choice'">
          <button class="btn btn-outline btn-sm" @click="applyStandardToCurrentQuestion">套用标准到当前题目</button>
          <button class="btn btn-outline btn-sm" @click="showPublishLogs">发布日志</button>
          <button class="btn btn-outline btn-sm" @click="saveStandardAsNextVersion">另存新版本</button>
          <button class="btn btn-outline btn-sm" :disabled="!canPublishCurrentStandard" @click="publishCurrentStandard">发布当前版本</button>
          <button class="btn btn-outline btn-sm danger" :disabled="!canArchiveCurrentStandard" @click="archiveCurrentStandard">归档当前版本</button>
          <button class="btn btn-outline btn-sm" @click="resetStandard">恢复默认</button>
          <button class="btn btn-primary btn-sm" :disabled="!canSaveCurrentStandard" @click="saveStandard">保存题型流程</button>
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
            <text class="meta-item">流程库：{{ listeningChoiceLibraryCount }}</text>
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
                  <text class="panel__desc">左侧编辑题型模板数据（自动同步到「题型模板」），中间按流程规则解析，右侧预览执行效果</text>
                </view>
                <button class="btn btn-outline btn-xs" @click="reloadDemoBaseFromTemplate">重新加载模板</button>
              </view>
              <view class="panel__body panel__body--template">
                <ListeningChoiceEditor
                  v-model="demoBase"
                  :preview-step-index="currentStepIndex"
                  template-mode
                  :focus-path="templateFocusPath"
                />
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
                    <text class="module-state__ref">当前版本：{{ draftModuleDisplayRef }}</text>
                    <text class="module-state__tag" :class="`is-${currentModuleStatus}`">{{ currentModuleStatusLabel }}</text>
                  </view>
                  <text class="module-state__id">流程 ID：{{ draftModuleId }}</text>
                  <view class="module-meta-grid">
                    <view class="form-item">
                      <text class="form-item__label">流程名称</text>
                      <input
                        class="text-input"
                        :value="draftModuleName"
                        placeholder="例如：听后选择标准 / 广东-听后选择流程"
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
                  </view>
                  <text class="module-state__hint">{{ currentModuleStatusHint }}</text>
                </view>
                <view class="panel__header-actions">
                  <button class="btn btn-outline btn-xs" @click="openReadonlyFlowVisual">查看流程图</button>
                </view>
              </view>
              <view class="panel__body">
                <ListeningChoiceFlowDiagram
                  :question="demoQuestion"
                  :steps="demoQuestion.flow.steps"
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
                          <view class="form-item">
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
                            <view class="form-item form-item--full">
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

                            <view class="form-item">
                              <text class="form-item__label">显示题目标题</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitle', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view class="form-item">
                              <text class="form-item__label">显示标题补充</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view class="form-item">
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

                          <template v-if="selectedConfig.kind === 'countdown'">
                            <view class="form-item form-item--full">
                              <text class="form-item__label">倒计时来源</text>
                              <text class="form-item__value-hint">秒数来自左侧题型模板的「题组准备时间（秒）」。此处只控制是否显示标题。</text>
                            </view>
                          </template>

                          <template v-if="selectedConfig.kind === 'promptTone'">
                            <view class="form-item form-item--full">
                              <text class="form-item__label">提示音 URL</text>
                              <input
                                class="text-input"
                                :value="String(getPerGroupRaw(selectedConfig.index, 'url') || '/static/audio/small_time.mp3')"
                                @input="(e) => patchPerGroupStep(selectedConfig.index, { url: e.detail.value })"
                              />
                            </view>
                          </template>

                          <template v-if="selectedConfig.kind === 'answerChoice'">
                            <view class="form-item">
                              <text class="form-item__label">显示题目标题</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitle', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitle', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view class="form-item">
                              <text class="form-item__label">显示标题补充</text>
                              <view
                                class="toggle"
                                :class="{ active: getPerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true) }"
                                @click="togglePerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true)"
                              >
                                {{ getPerGroupBool(selectedConfig.index, 'showQuestionTitleDescription', true) ? '是' : '否' }}
                              </view>
                            </view>

                            <view class="form-item">
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
              </view>
            </view>

            <view v-if="commitValidationIssues.length > 0" class="panel panel--blocking">
              <view class="panel__header panel__header--blocking">
                <view class="panel__header-left">
                  <text class="panel__title">保存/发布阻断项</text>
                  <text class="panel__desc">修复以下问题后，才能保存或发布流程版本</text>
                </view>
                <view class="panel__header-actions">
                  <button class="btn btn-outline btn-xs" @click="jumpToFirstCommitValidationIssue">定位首个问题</button>
                  <button class="btn btn-outline btn-xs" @click="clearCommitValidationIssues">清空</button>
                </view>
              </view>
              <view class="panel__body">
                <view class="blocking-list">
                  <view
                    v-for="item in commitValidationIssues"
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

            <view class="panel panel--guide">
              <view class="panel__header">
                <view class="panel__header-left">
                  <text class="panel__title">编辑上手引导</text>
                  <text class="panel__desc">建议按“题目编辑 → 流程编辑 → 路由编辑”完成一次全链路配置</text>
                </view>
                <view class="panel__header-actions">
                  <button
                    class="btn btn-outline btn-xs"
                    :class="{ 'is-active': onboardingStage === 'question' }"
                    @click="setOnboardingStage('question')"
                  >题目编辑</button>
                  <button
                    class="btn btn-outline btn-xs"
                    :class="{ 'is-active': onboardingStage === 'flow' }"
                    @click="setOnboardingStage('flow')"
                  >流程编辑</button>
                  <button
                    class="btn btn-outline btn-xs"
                    :class="{ 'is-active': onboardingStage === 'routing' }"
                    @click="setOnboardingStage('routing')"
                  >路由编辑</button>
                </view>
              </view>
              <view class="panel__body">
                <view class="onboarding">
                  <text class="onboarding__stage">{{ onboardingStageMeta.title }}</text>
                  <text class="onboarding__desc">{{ onboardingStageMeta.description }}</text>
                  <view class="onboarding__list">
                    <text
                      v-for="(item, idx) in onboardingStageMeta.checklist"
                      :key="`${onboardingStage}:${idx}`"
                      class="onboarding__item"
                    >{{ idx + 1 }}. {{ item }}</text>
                  </view>
                  <view class="onboarding__actions">
                    <button
                      v-for="action in onboardingStageMeta.actions"
                      :key="action.key"
                      class="btn btn-outline btn-xs"
                      @click="runOnboardingAction(action.key)"
                    >{{ action.label }}</button>
                  </view>
                  <view v-if="onboardingStage === 'routing'" class="onboarding__preset">
                    <text class="onboarding__preset-title">路由预置模板</text>
                    <view class="onboarding__preset-actions">
                      <button class="btn btn-outline btn-xs" @click="applyRoutePreset('national_default')">全国通用</button>
                      <button class="btn btn-outline btn-xs" @click="applyRoutePreset('region_scene_demo')">地区+场景示例</button>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <view class="panel" :class="{ 'panel--focus': routePanelFocusActive }">
              <view class="panel__header">
                <view class="panel__header-left">
                  <text class="panel__title">题型流程路由</text>
                  <text class="panel__desc">按地区/场景/年级绑定流程版本，编辑器与预览会按匹配结果自动选择流程</text>
                </view>
                <view class="panel__header-actions">
                  <button
                    class="btn btn-outline btn-xs"
                    :disabled="flowProfilesMigratableToCurrentVersion.length === 0"
                    @click="migrateFlowProfilesToCurrentVersion"
                  >迁移到当前版本{{ flowProfilesMigratableToCurrentVersion.length > 0 ? `(${flowProfilesMigratableToCurrentVersion.length})` : '' }}</button>
                  <button
                    class="btn btn-outline btn-xs danger"
                    :disabled="flowModulesArchivableToCurrentVersion.length === 0"
                    @click="archiveHistoricalStandards"
                  >批量归档旧版本{{ flowModulesArchivableToCurrentVersion.length > 0 ? `(${flowModulesArchivableToCurrentVersion.length})` : '' }}</button>
                  <button class="btn btn-outline btn-xs" @click="addFlowProfileRule">新增路由</button>
                  <button class="btn btn-outline btn-xs" @click="resetFlowProfileRules">重置路由</button>
                </view>
              </view>
              <view class="panel__body">
                <view v-if="flowProfileRules.length === 0" class="empty-tip">暂无路由规则</view>

                <view v-else class="profile-list">
                  <view
                    v-for="profile in flowProfileRules"
                    :key="profile.id"
                    class="profile-card"
                    :class="{ 'is-focus': routePanelFocusProfileId === profile.id }"
                  >
                    <view class="profile-card__head">
                      <text class="profile-card__id">{{ profile.id }}</text>
                      <text class="profile-card__module">{{ formatModuleDisplayRef(profile.module) }}</text>
                    </view>

                    <view class="profile-grid">
                      <view class="form-item">
                        <text class="form-item__label">规则名称</text>
                        <input
                          class="text-input"
                          :value="profile.note || ''"
                          placeholder="例如：广东中考听后选择"
                          @input="(e) => updateFlowProfileText(profile.id, 'note', e.detail.value)"
                        />
                      </view>

                      <view class="form-item">
                        <text class="form-item__label">优先级</text>
                        <input
                          class="text-input"
                          type="number"
                          :value="Number(profile.priority || 0)"
                          @input="(e) => updateFlowProfilePriority(profile.id, e.detail.value)"
                        />
                      </view>

                      <view class="form-item">
                        <text class="form-item__label">地区</text>
                        <input
                          class="text-input"
                          :value="profile.region || ''"
                          placeholder="留空=通配"
                          @input="(e) => updateFlowProfileText(profile.id, 'region', e.detail.value)"
                        />
                      </view>

                      <view class="form-item">
                        <text class="form-item__label">场景</text>
                        <input
                          class="text-input"
                          :value="profile.scene || ''"
                          placeholder="留空=通配"
                          @input="(e) => updateFlowProfileText(profile.id, 'scene', e.detail.value)"
                        />
                      </view>

                      <view class="form-item">
                        <text class="form-item__label">年级</text>
                        <input
                          class="text-input"
                          :value="profile.grade || ''"
                          placeholder="留空=通配"
                          @input="(e) => updateFlowProfileText(profile.id, 'grade', e.detail.value)"
                        />
                      </view>

                      <view class="form-item">
                        <text class="form-item__label">启用</text>
                        <view class="toggle" :class="{ active: profile.enabled !== false }" @click="toggleFlowProfileEnabled(profile.id)">
                          {{ profile.enabled === false ? '否' : '是' }}
                        </view>
                      </view>

                      <view class="form-item">
                        <text class="form-item__label">模块 ID</text>
                        <input
                          class="text-input"
                          :value="profile.module.id"
                          placeholder="listening_choice.standard.v1"
                          @input="(e) => updateFlowProfileModuleId(profile.id, e.detail.value)"
                        />
                      </view>

                      <view class="form-item">
                        <text class="form-item__label">模块版本</text>
                        <input
                          class="text-input"
                          type="number"
                          :value="Number(profile.module.version || 1)"
                          @input="(e) => updateFlowProfileModuleVersion(profile.id, e.detail.value)"
                        />
                      </view>
                    </view>

                    <view class="profile-ref-list">
                      <text class="profile-ref-list__label">可选版本（仅已发布）</text>
                      <view class="profile-ref-list__chips">
                        <view
                          v-for="m in flowModuleRefOptions"
                          :key="`${m.id}:${m.version}`"
                          class="profile-chip"
                          :class="{ active: m.id === profile.module.id && Number(m.version) === Number(profile.module.version) }"
                          @click="bindProfileToModuleRef(profile.id, { id: m.id, version: Number(m.version) })"
                        >
                          {{ formatModuleDisplayRef(m) }}（已发布）
                        </view>
                      </view>
                    </view>

                    <view class="profile-card__actions">
                      <button class="btn btn-outline btn-xs" @click="bindProfileToDraftModule(profile.id)">绑定当前流程版本</button>
                      <button
                        class="btn btn-outline btn-xs danger"
                        :disabled="!canRemoveFlowProfile(profile.id)"
                        @click="removeFlowProfileRule(profile.id)"
                      >删除路由</button>
                    </view>
                  </view>
                </view>

                <view class="route-check">
                  <view class="route-check__head">
                    <text class="route-check__title">路由规则检查</text>
                    <text class="route-check__meta">
                      冲突 {{ flowProfileDiagnostics.conflicts.length }}
                      · 潜在死规则 {{ flowProfileDiagnostics.deadRules.length }}
                      · 弱覆盖 {{ flowProfileDiagnostics.weakCoverage.length }}
                      · 可提交 {{ flowProfileSubmitValidation.ok ? '是' : '否' }}
                    </text>
                  </view>

                  <view class="route-check__section">
                    <text class="route-check__section-title">冲突规则</text>
                    <view v-if="flowProfileDiagnostics.conflicts.length === 0" class="route-check__ok">未发现冲突规则</view>
                    <view v-else class="route-check__list">
                      <view v-for="item in flowProfileDiagnostics.conflicts" :key="item.signature" class="route-check__item">
                        <text class="route-check__item-main">{{ item.signature }}</text>
                        <text class="route-check__item-sub">{{ item.ids.join(' / ') }}</text>
                      </view>
                    </view>
                  </view>

                <view class="route-check__section">
                  <text class="route-check__section-title">潜在死规则</text>
                  <view v-if="flowProfileDiagnostics.deadRules.length === 0" class="route-check__ok">未发现潜在死规则</view>
                  <view v-else class="route-check__list">
                      <view v-for="item in flowProfileDiagnostics.deadRules" :key="item.id" class="route-check__item">
                        <text class="route-check__item-main">{{ item.id }}</text>
                        <text class="route-check__item-sub">被更高优先级规则覆盖：{{ item.blockedBy.join(' / ') }}</text>
                    </view>
                  </view>
                </view>

                <view class="route-check__section">
                  <text class="route-check__section-title">弱覆盖提示</text>
                  <view v-if="flowProfileDiagnostics.weakCoverage.length === 0" class="route-check__ok">未发现弱覆盖风险</view>
                  <view v-else class="route-check__list">
                    <view v-for="item in flowProfileDiagnostics.weakCoverage" :key="item.id" class="route-check__item">
                      <text class="route-check__item-main">{{ item.id }}</text>
                      <text class="route-check__item-sub">{{ item.reason }}</text>
                    </view>
                  </view>
                </view>

                <view class="route-check__section">
                  <view class="route-check__section-head">
                    <text class="route-check__section-title">自动修复建议</text>
                    <button
                      v-if="flowProfileFixSuggestions.length > 0"
                      class="btn btn-outline btn-xs"
                      @click="applyAllFlowProfileFixSuggestions"
                    >预览全部修复</button>
                  </view>
                  <view v-if="flowProfileFixSuggestions.length === 0" class="route-check__ok">当前无需自动修复</view>
                  <view v-else class="route-check__list">
                    <view v-for="item in flowProfileFixSuggestions" :key="item.key" class="route-check__item">
                      <text class="route-check__item-main">{{ item.summary }}</text>
                      <text class="route-check__item-sub">{{ item.reason }}</text>
                      <view class="route-check__item-actions">
                        <button
                          v-if="item.autoApplicable !== false && Object.keys(item.patch || {}).length > 0"
                          class="btn btn-outline btn-xs"
                          @click="applyFlowProfileFixSuggestion(item)"
                        >预览修复</button>
                        <text v-else class="route-check__manual-tip">需手动处理</text>
                      </view>
                    </view>
                  </view>
                </view>

                <view class="route-check__section" v-if="pendingFlowProfileFixSuggestions.length > 0">
                  <view class="route-check__section-head">
                    <text class="route-check__section-title">修复预览</text>
                    <view class="route-check__preview-actions">
                      <button class="btn btn-outline btn-xs" @click="cancelFlowProfileFixPreview">取消</button>
                      <button class="btn btn-primary btn-xs" @click="confirmFlowProfileFixPreview">确认应用</button>
                    </view>
                  </view>
                  <view class="route-check__list">
                    <view v-for="item in pendingFlowProfileFixSuggestions" :key="item.key" class="route-check__item">
                      <text class="route-check__item-main">{{ item.summary }}</text>
                      <text class="route-check__item-sub">{{ item.previewText }}</text>
                      <view class="route-check__preview-fields">
                        <view v-for="field in item.previewFields" :key="`${item.key}:${field.key}`" class="route-check__preview-field">
                          <text class="route-check__preview-key">{{ field.key }}</text>
                          <text class="route-check__preview-before">修改前：{{ field.before }}</text>
                          <text class="route-check__preview-after">修改后：{{ field.after }}</text>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
                </view>

                <view class="route-sim">
                  <view class="route-sim__head">
                    <view class="route-sim__head-main">
                      <text class="route-sim__title">路由命中模拟</text>
                      <text class="route-sim__desc">输入上下文后，查看当前会命中哪条路由规则与流程版本</text>
                    </view>
                    <view class="route-sim__head-actions">
                      <button class="btn btn-outline btn-xs" @click="loadRouteSimFromCurrentQuestion">读取当前题目上下文</button>
                      <button class="btn btn-outline btn-xs" @click="syncRouteSimToCurrentQuestion">写回当前题目上下文</button>
                    </view>
                  </view>

                  <view class="route-sim__grid">
                    <view class="form-item">
                      <text class="form-item__label">模拟地区</text>
                      <input
                        class="text-input"
                        :value="routeSimRegion"
                        placeholder="例如：广东"
                        @input="(e) => routeSimRegion = e.detail.value"
                      />
                    </view>

                    <view class="form-item">
                      <text class="form-item__label">模拟场景</text>
                      <input
                        class="text-input"
                        :value="routeSimScene"
                        placeholder="例如：中考"
                        @input="(e) => routeSimScene = e.detail.value"
                      />
                    </view>

                    <view class="form-item">
                      <text class="form-item__label">模拟年级</text>
                      <input
                        class="text-input"
                        :value="routeSimGrade"
                        placeholder="例如：九年级"
                        @input="(e) => routeSimGrade = e.detail.value"
                      />
                    </view>
                  </view>

                  <view class="route-sim__result">
                    <text class="route-sim__result-title">匹配结果</text>
                    <template v-if="simulatedProfile && simulatedBestCandidate">
                      <text class="route-sim__line">规则：{{ simulatedProfile.id }}（{{ simulatedProfile.note || '未命名' }}）</text>
                      <text class="route-sim__line">模块：{{ formatModuleDisplayRef(simulatedProfile.module) }}</text>
                      <text class="route-sim__line" v-if="simulatedModule">模块备注：{{ simulatedModule.note || '无' }}</text>
                      <text class="route-sim__line" v-else>模块备注：未找到对应模块（请检查模块 ID / 版本）</text>
                      <text class="route-sim__line">匹配分解：地区 {{ simulatedBestCandidate.regionScore }} + 场景 {{ simulatedBestCandidate.sceneScore }} + 年级 {{ simulatedBestCandidate.gradeScore }} + 优先级 {{ simulatedBestCandidate.priorityScore }}</text>
                      <text class="route-sim__line">总分：{{ simulatedBestCandidate.totalScore }}</text>
                      <text class="route-sim__line">候选数：{{ simulatedRankedCandidates.length }}</text>
                    </template>
                    <text v-else class="route-sim__line">未命中路由规则</text>
                  </view>

                  <view class="route-sim__result route-sim__result--soft" v-if="simulatedRankedCandidates.length > 0">
                    <text class="route-sim__result-title">匹配分解</text>
                    <view class="route-sim__rank-list">
                      <view v-for="item in simulatedRankedCandidates.slice(0, 3)" :key="item.profile.id" class="route-sim__rank-item">
                        <text class="route-sim__rank-main">{{ item.profile.id }} · 总分 {{ item.totalScore }}</text>
                        <text class="route-sim__rank-sub">地区 {{ item.regionScore }} / 场景 {{ item.sceneScore }} / 年级 {{ item.gradeScore }} / 优先级 {{ item.priorityScore }}</text>
                      </view>
                    </view>
                  </view>

                  <view class="flow-diagnostics">
                    <view class="flow-diagnostics__head">
                      <view class="flow-diagnostics__head-main">
                        <text class="flow-diagnostics__title">引擎诊断面板</text>
                        <text class="flow-diagnostics__desc">汇总路由命中、当前 step、autoNext 原因，并记录 trace 轨迹</text>
                      </view>
                      <view class="flow-diagnostics__head-actions">
                        <button class="btn btn-outline btn-xs" @click="clearFlowCenterDiagnosticsTrace">清空 trace</button>
                        <button class="btn btn-outline btn-xs" @click="exportFlowCenterDiagnostics">导出 trace</button>
                      </view>
                    </view>

                    <view class="flow-diagnostics__grid">
                      <text class="flow-diagnostics__line">命中规则：{{ flowCenterHitRuleText }}</text>
                      <text class="flow-diagnostics__line">模块版本：{{ flowCenterHitModuleVersionText }}</text>
                      <text class="flow-diagnostics__line">当前 step：{{ flowCenterCurrentStepText }}</text>
                      <text class="flow-diagnostics__line">autoNext 原因：{{ flowCenterAutoNextReasonText }}</text>
                    </view>

                    <view class="flow-diagnostics__trace">
                      <text class="flow-diagnostics__trace-title">trace</text>
                      <view v-if="flowCenterTraceEvents.length > 0" class="flow-diagnostics__trace-list">
                        <view v-for="item in flowCenterTraceEvents.slice(0, 8)" :key="item.id" class="flow-diagnostics__trace-item">
                          <view class="flow-diagnostics__trace-head">
                            <text class="flow-diagnostics__trace-time">{{ item.time }}</text>
                            <text class="flow-diagnostics__trace-type">{{ item.type }}</text>
                          </view>
                          <text class="flow-diagnostics__trace-text">{{ item.message }}</text>
                        </view>
                      </view>
                      <view v-else class="empty-tip">暂无 trace</view>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <view class="panel">
              <view class="panel__header">
                <view class="panel__header-left">
                  <text class="panel__title">题型流程库 (自动沉淀)</text>
                  <text class="panel__desc">当题目的流程结构偏离标准时，会自动保存到这里</text>
                </view>
              </view>
              <view class="panel__body">
                <view v-if="libraryModules.length === 0" class="empty-tip">暂无自定义流程</view>

                <view v-else class="library-list">
                  <view v-for="m in libraryModules" :key="m.id" class="lib-card">
                    <view class="lib-card__main">
                      <text class="lib-card__title">{{ m.id }}</text>
                      <text class="lib-card__meta">{{ m.createdAt }}</text>
                      <text class="lib-card__steps">{{ summarizeSteps(m.steps) }}</text>
                    </view>
                    <view class="lib-card__ops">
                      <button class="btn btn-outline btn-xs" @click="applyLibraryToCurrentQuestion(m.id)">套用到当前题目</button>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="col col--preview">
          <PhonePreviewPanel
            title="预览"
            :data="demoQuestion"
            :answers="previewAnswers"
            :show-answer="showAnswer"
            :step-index="currentStepIndex"
            :total-steps="previewTotalSteps"
            @prev="previewPrevStep"
            @next="previewNextStep"
            @toggle-answer="showAnswer = !showAnswer"
            @select="onPreviewSelect"
            @step-change="onPreviewStepChange"
          />
        </view>
      </view>
    </view>

    <view v-if="readonlyFlowVisualVisible" class="flow-visual-modal">
      <view class="flow-visual-modal__mask" @click="closeReadonlyFlowVisual" />
      <view class="flow-visual-modal__panel">
        <view class="flow-visual-modal__header">
          <view class="flow-visual-modal__title-wrap">
            <text class="flow-visual-modal__title">只读流程图</text>
            <text class="flow-visual-modal__desc">由当前流程步骤自动生成，可用于结构检查与节点详情查看</text>
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
          </view>

          <view
            class="flow-visual-canvas-dropzone"
            @dragover.stop.prevent
            @drop.stop.prevent="onReadonlyFlowVisualDrop"
          >
            <scroll-view scroll-y class="flow-visual-canvas-wrap">
              <ReadonlyFlowCanvas
                :graph="readonlyFlowGraph"
                :active-node-id="readonlyFlowVisualActiveNodeId"
                :recently-moved-node-id="readonlyFlowRecentlyMovedNodeId"
                @select-node="selectReadonlyFlowVisualNode"
                @reorder-node="reorderReadonlyFlowVisualNode"
                @insert-stencil-near-node="insertReadonlyFlowVisualStepNearNode"
              />
            </scroll-view>
          </view>

          <view class="flow-visual-detail">
            <text class="flow-visual-detail__title">节点详情</text>
            <template v-if="readonlyFlowVisualActiveNode">
              <text class="flow-visual-detail__line">节点：{{ readonlyFlowVisualActiveNode.label }}</text>
              <text class="flow-visual-detail__line">kind：{{ readonlyFlowVisualActiveNode.data.stepKind || '-' }}</text>
              <text class="flow-visual-detail__line">stepId：{{ readonlyFlowVisualActiveNode.data.stepId || '-' }}</text>
              <text class="flow-visual-detail__line">autoNext：{{ readonlyFlowVisualActiveNode.data.autoNext || '-' }}</text>
              <text class="flow-visual-detail__line">题组：{{ readonlyFlowVisualActiveNode.data.groupId || '-' }}</text>
              <text class="flow-visual-detail__line">小题数：{{ readonlyFlowVisualActiveNode.data.questionCount }}</text>
            </template>
            <text v-else class="flow-visual-detail__line">暂无节点</text>

            <PropertyPanel
              :node="readonlyFlowVisualActiveNode"
              :fields="readonlyFlowVisualPropertyFields"
              @patch="patchReadonlyFlowVisualNode"
              @remove="removeReadonlyFlowVisualNode"
              @move-up="moveReadonlyFlowVisualNodeUp"
              @move-down="moveReadonlyFlowVisualNodeDown"
              @reset="resetReadonlyFlowVisualFromQuestion"
            />

            <view class="flow-visual-compile">
              <text class="flow-visual-detail__title">线性编译结果</text>
              <text class="flow-visual-detail__line">预览覆盖：{{ hasVisualPreviewOverride ? '已启用' : '未启用' }}</text>
              <template v-if="readonlyFlowCompileResult.ok">
                <text class="flow-visual-compile__status is-ok">状态：可编译（{{ readonlyFlowCompileResult.steps.length }} steps）</text>
                <view class="flow-visual-compile__list">
                  <text
                    v-for="item in readonlyFlowCompiledStepPreview"
                    :key="item.id"
                    class="flow-visual-detail__line"
                  >{{ item.id }} · {{ item.kind }} · {{ item.autoNext || 'manual' }}</text>
                </view>
              </template>
              <template v-else>
                <text class="flow-visual-compile__status is-error">状态：不可编译（{{ readonlyFlowCompileResult.errors.length }} errors）</text>
                <view class="flow-visual-compile__list">
                  <text
                    v-for="item in readonlyFlowCompileResult.errors.slice(0, 5)"
                    :key="`${item.code}:${item.path}`"
                    class="flow-visual-detail__line"
                  >{{ item.code }} · {{ item.message }}</text>
                </view>
              </template>
            </view>
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
  FlowProfileV1,
  ListeningChoiceFlowModuleV1,
  ListeningChoiceQuestion,
  Question,
  SubQuestion
} from '/types'
import ListeningChoiceEditor from '/components/editor/ListeningChoiceEditor.vue'
import ListeningChoiceFlowDiagram from '/components/editor/ListeningChoiceFlowDiagram.vue'
import FlowStepQuickAdd from '/components/editor/FlowStepQuickAdd.vue'
import ReadonlyFlowCanvas from '/components/editor/flow-visual/ReadonlyFlowCanvas.vue'
import StencilPanel from '/components/editor/flow-visual/StencilPanel.vue'
import PropertyPanel from '/components/editor/flow-visual/PropertyPanel.vue'
import PhonePreviewPanel from '/components/layout/PhonePreviewPanel.vue'
import { contentTemplates } from '/stores/contentTemplates'
import { flowLibrary } from '/stores/flowLibrary'
import { flowModules } from '/stores/flowModules'
import { flowProfiles } from '/stores/flowProfiles'
import { questionDraft } from '/stores/questionDraft'
import { appShell } from '/stores/appShell'
import { runtimeDebug, type RuntimeDebugEvent } from '/stores/runtimeDebug'
import {
  patchListeningChoiceQuestionFlow
} from './flow-modules/currentQuestionBridge'
import { generateId } from '/templates'
import {
  buildFlowProfileFixSuggestions as buildFlowProfileFixSuggestionsUsecase,
  canSubmitFlowProfiles,
  diagnoseFlowProfileRules as diagnoseFlowProfileRulesUsecase,
  type FlowProfileDiagnostics as FlowProfileDiagnosticsUsecase,
  type FlowProfileFixSuggestion as FlowProfileFixSuggestionUsecase,
  type FlowProfileSubmitValidation
} from '/domain/flow-profile/usecases/scoreProfiles'
import { buildModuleDiffSummary, formatModuleDiffSummary } from '/domain/flow-module/usecases/buildModuleDiffSummary'
import { validateListeningChoiceModuleCommitCrossChecks } from '/domain/flow-module/usecases/validateModuleCommitCrossChecks'
import {
  DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
  LISTENING_CHOICE_STANDARD_FLOW_ID,
  type ListeningChoiceStandardFlowModuleV1,
  materializeListeningChoiceStandardSteps,
  materializeListeningChoiceTemplateSteps,
  validateListeningChoiceStandardModule
} from '../../flows/listeningChoiceFlowModules'
import {
  usePerGroupStepEditor,
  type QuickAddPerGroupKind
} from './flow-modules/usePerGroupStepEditor'
import { useRouteSimulator } from './flow-modules/useRouteSimulator'
import {
  useEditableFlowGraph,
  type FlowVisualNodePatch
} from './flow-modules/useEditableFlowGraph'
import type { VisualLinearStep } from '/domain/flow-visual/usecases/compileGraphToSteps'
import { buildListeningChoiceModuleFromLinearSteps } from '/domain/flow-visual/usecases/buildListeningChoiceModuleFromLinearSteps'
import {
  useModuleLifecycle,
  type ModuleCommitValidationPayload,
  type ModuleCommitValidationResult
} from './flow-modules/useModuleLifecycle'

type Page = 'home' | 'listening_choice'
const DEFAULT_LISTENING_CHOICE_MODULE_NAME = '听后选择标准'

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
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
  return id === LISTENING_CHOICE_STANDARD_FLOW_ID ? DEFAULT_LISTENING_CHOICE_MODULE_NAME : id
}

type ModuleDisplayRefLike = Partial<FlowModuleRef & { name?: string | null }> | null | undefined

function formatModuleDisplayRef(refLike: ModuleDisplayRefLike): string {
  const id = String(refLike?.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
  const version = Math.max(1, toInt(refLike?.version || 1))
  const hit = flowModules.getListeningChoiceByRef({ id, version })
  const name = normalizeModuleName(refLike?.name || hit?.name, moduleNameFallbackById(id))
  return `${name} @ v${version}`
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toLegacyStandardModule(moduleInput: unknown): ListeningChoiceStandardFlowModuleV1 {
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

function getDefaultModule(): ListeningChoiceFlowModuleV1 {
  const module = flowModules.getListeningChoiceDefault()
  if (module) return module
  return {
    kind: 'listening_choice',
    id: LISTENING_CHOICE_STANDARD_FLOW_ID,
    version: 1,
    name: DEFAULT_LISTENING_CHOICE_MODULE_NAME,
    note: '',
    status: 'published',
    ...DEFAULT_LISTENING_CHOICE_STANDARD_MODULE
  }
}

function buildQuestionFromTemplate(): ListeningChoiceQuestion {
  const tpl = contentTemplates.state.listeningChoice
  const defaultModule = getDefaultModule()
  return {
    id: 'flow_demo:listening_choice',
    type: 'listening_choice',
    optionStyle: tpl.optionStyle || 'ABCD',
    content: clone(tpl.content),
    flow: {
      version: 1,
      mode: 'semi-auto',
      source: {
        kind: 'standard',
        id: String(defaultModule.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
        version: Number(defaultModule.version || 1),
        overrides: {}
      },
      steps: []
    }
  } as ListeningChoiceQuestion
}

const page = ref<Page>('home')
const defaultModule = getDefaultModule()
const draftModuleId = ref(String(defaultModule.id || LISTENING_CHOICE_STANDARD_FLOW_ID))
const draftModuleVersion = ref(Number(defaultModule.version || 1))
const draftModuleName = ref(normalizeModuleName(defaultModule.name, DEFAULT_LISTENING_CHOICE_MODULE_NAME))
const draftModuleNote = ref(normalizeModuleNote(defaultModule?.note))
const listeningChoiceDraft = ref<ListeningChoiceStandardFlowModuleV1>(clone(toLegacyStandardModule(defaultModule)))
const draftModuleDisplayRef = computed(() => {
  const id = String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID)
  const fallbackName = id === LISTENING_CHOICE_STANDARD_FLOW_ID ? DEFAULT_LISTENING_CHOICE_MODULE_NAME : id
  const name = normalizeModuleName(draftModuleName.value, fallbackName)
  const version = Math.max(1, toInt(draftModuleVersion.value || 1))
  return `${name} @ v${version}`
})
const demoBase = computed<ListeningChoiceQuestion>({
  get() {
    return buildQuestionFromTemplate()
  },
  set(next) {
    contentTemplates.setListeningChoice({
      version: 1,
      optionStyle: next?.optionStyle || 'ABCD',
      content: clone(next?.content || contentTemplates.state.listeningChoice.content)
    })
  }
})

const libraryModules = computed(() => {
  return (flowLibrary.state.modules || []).filter(m => m.type === 'listening_choice')
})

const listeningChoiceLibraryCount = computed(() => libraryModules.value.length)
const flowProfileRules = computed<FlowProfileV1[]>(() => flowProfiles.listByQuestionType('listening_choice'))
const flowModuleRefOptions = computed(() => {
  return (flowModules.listListeningChoice() || []).filter((m) => m?.status === 'published')
})
const routeSimulator = useRouteSimulator({
  flowProfileRules,
  getCurrentQuestionSnapshot,
  persistCurrentQuestion
})
const {
  routeSimRegion,
  routeSimScene,
  routeSimGrade,
  routeSimScoreResult,
  simulatedRankedCandidates,
  simulatedBestCandidate,
  simulatedProfile,
  simulatedModule
} = routeSimulator
const flowProfileDiagnostics = computed<FlowProfileDiagnosticsUsecase>(() => diagnoseFlowProfileRules(flowProfileRules.value || []))
const flowProfileFixSuggestions = computed(() => {
  return buildFlowProfileFixSuggestions(flowProfileDiagnostics.value, flowProfileRules.value || [])
})
const flowProfileSubmitValidation = computed<FlowProfileSubmitValidation>(() => {
  return canSubmitFlowProfiles(flowProfileRules.value || [])
})
const pendingFlowProfileFixSuggestions = ref<FlowProfileFixPreviewItem[]>([])
type OnboardingStage = 'question' | 'flow' | 'routing'

type OnboardingAction = {
  key: string
  label: string
}

type OnboardingStageMeta = {
  title: string
  description: string
  checklist: string[]
  actions: OnboardingAction[]
}

type RoutePresetKind = 'national_default' | 'region_scene_demo'

const onboardingStage = ref<OnboardingStage>('question')
const onboardingStageMetaMap: Record<OnboardingStage, OnboardingStageMeta> = {
  question: {
    title: '题目编辑',
    description: '先确认题面字段完整，再把上下文写入当前题目，避免后续流程预览偏差。',
    checklist: [
      '校对题组结构、音频字段和准备时长',
      '读取当前题目上下文（地区/场景/年级）',
      '必要时把模拟上下文写回当前题目'
    ],
    actions: [
      { key: 'question_load_ctx', label: '读取题目上下文' },
      { key: 'question_sync_ctx', label: '写回题目上下文' },
      { key: 'question_apply_standard', label: '套用当前流程' }
    ]
  },
  flow: {
    title: '流程编辑',
    description: '在流程图侧完成步骤增删改，并通过“保存/另存/发布”沉淀为可路由版本。',
    checklist: [
      '配置介绍页、每题组步骤及关键参数',
      '先保存草稿，再另存新版本做增量调整',
      '确认无阻断项后发布当前版本'
    ],
    actions: [
      { key: 'flow_save_draft', label: '保存题型流程' },
      { key: 'flow_save_next', label: '另存新版本' },
      { key: 'flow_publish', label: '发布当前版本' }
    ]
  },
  routing: {
    title: '路由编辑',
    description: '通过规则把流程版本绑定到地区/场景/年级，并用模拟器验证命中结果。',
    checklist: [
      '新增或调整路由规则并设置优先级',
      '将旧规则批量迁移到当前流程版本',
      '执行路由命中模拟并确认模块版本'
    ],
    actions: [
      { key: 'routing_add_rule', label: '新增路由' },
      { key: 'routing_migrate', label: '迁移到当前版本' },
      { key: 'routing_simulate', label: '加载题目上下文模拟' }
    ]
  }
}
const onboardingStageMeta = computed(() => onboardingStageMetaMap[onboardingStage.value])

function setOnboardingStage(stage: OnboardingStage) {
  onboardingStage.value = stage
}

function loadRouteSimFromCurrentQuestion() {
  routeSimulator.loadRouteSimFromCurrentQuestion()
}

function syncRouteSimToCurrentQuestion() {
  routeSimulator.syncRouteSimToCurrentQuestion()
}

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

type FlowProfileFixSuggestion = FlowProfileFixSuggestionUsecase

type FlowProfileFixFieldDiff = {
  key: string
  before: string
  after: string
}

type FlowProfileFixPreviewItem = FlowProfileFixSuggestion & {
  previewText: string
  previewFields: FlowProfileFixFieldDiff[]
}

type CommitValidationIssueScope = 'template' | 'routing' | 'unknown'

type CommitValidationIssue = {
  key: string
  code: string
  path: string
  message: string
  scope: CommitValidationIssueScope
  locationLabel: string
  targetProfileId?: string
}

const commitValidationIssues = ref<CommitValidationIssue[]>([])
const activeCommitValidationIssueKey = ref('')
const templateFocusPath = ref('')
const routePanelFocusActive = ref(false)
const routePanelFocusProfileId = ref('')
let routePanelFocusTimer: ReturnType<typeof setTimeout> | null = null

function resolveCommitValidationScope(path: string): CommitValidationIssueScope {
  if (path.startsWith('content.')) return 'template'
  if (path.startsWith('flowProfiles')) return 'routing'
  return 'unknown'
}

function resolveCommitValidationLocationLabel(path: string, scope: CommitValidationIssueScope, profileId?: string): string {
  if (scope === 'template') {
    const groupMatch = path.match(/content\.groups\[(\d+)\]/)
    if (groupMatch) {
      const gIndex = Number(groupMatch[1] || 0)
      return `题目模板 > 题组 ${gIndex + 1}`
    }
    if (path.startsWith('content.intro')) return '题目模板 > 题目说明'
    return '题目模板'
  }
  if (scope === 'routing') {
    if (profileId) return `流程路由 > ${profileId}`
    return '流程路由'
  }
  return '未知区域'
}

function normalizeCommitValidationIssue(
  issue: { code?: string; path?: string; message?: string },
  index: number
): CommitValidationIssue {
  const code = String(issue?.code || 'unknown_issue')
  const path = String(issue?.path || '')
  const message = String(issue?.message || '流程提交前校验未通过')
  const scope = resolveCommitValidationScope(path)
  const profileMatch = path.match(/flowProfiles\[\d+\]\(([^)]+)\)/)
  const targetProfileId = profileMatch?.[1] ? String(profileMatch[1]) : undefined
  const locationLabel = resolveCommitValidationLocationLabel(path, scope, targetProfileId)
  return {
    key: `${code}:${path}:${index}`,
    code,
    path,
    message,
    scope,
    locationLabel,
    targetProfileId
  }
}

function setRoutePanelFocus(profileId?: string) {
  routePanelFocusActive.value = true
  routePanelFocusProfileId.value = profileId || ''
  if (routePanelFocusTimer) clearTimeout(routePanelFocusTimer)
  routePanelFocusTimer = setTimeout(() => {
    routePanelFocusActive.value = false
    routePanelFocusProfileId.value = ''
    routePanelFocusTimer = null
  }, 1800)
}

function clearCommitValidationIssues() {
  commitValidationIssues.value = []
  activeCommitValidationIssueKey.value = ''
  templateFocusPath.value = ''
  routePanelFocusActive.value = false
  routePanelFocusProfileId.value = ''
  if (routePanelFocusTimer) {
    clearTimeout(routePanelFocusTimer)
    routePanelFocusTimer = null
  }
}

function jumpToCommitValidationIssue(issue: CommitValidationIssue) {
  activeCommitValidationIssueKey.value = issue.key
  if (issue.scope === 'template') {
    templateFocusPath.value = issue.path
    routePanelFocusActive.value = false
    routePanelFocusProfileId.value = ''
    uni.showToast({ title: `已定位：${issue.locationLabel}`, icon: 'none' })
    return
  }
  if (issue.scope === 'routing') {
    templateFocusPath.value = ''
    setRoutePanelFocus(issue.targetProfileId)
    uni.showToast({ title: `已定位：${issue.locationLabel}`, icon: 'none' })
    return
  }
  uni.showToast({ title: '该问题暂不支持自动定位', icon: 'none' })
}

function jumpToFirstCommitValidationIssue() {
  const first = commitValidationIssues.value[0]
  if (!first) {
    uni.showToast({ title: '当前无阻断项', icon: 'none' })
    return
  }
  jumpToCommitValidationIssue(first)
}

function handleModuleCommitValidationFailed(result: ModuleCommitValidationResult): boolean {
  if (!Array.isArray(commitValidationIssues.value) || commitValidationIssues.value.length <= 0) {
    const normalized = (Array.isArray(result.issues) ? result.issues : [])
      .map(normalizeCommitValidationIssue)
    commitValidationIssues.value = normalized
  }
  if (commitValidationIssues.value.length > 0) {
    jumpToCommitValidationIssue(commitValidationIssues.value[0])
  }
  return true
}

function diagnoseFlowProfileRules(profiles: FlowProfileV1[]): FlowProfileDiagnosticsUsecase {
  return diagnoseFlowProfileRulesUsecase(profiles || [])
}

function buildFlowProfileFixSuggestions(
  diagnostics: FlowProfileDiagnosticsUsecase,
  profiles: FlowProfileV1[]
): FlowProfileFixSuggestion[] {
  return buildFlowProfileFixSuggestionsUsecase(diagnostics, profiles || [])
}

function toFlowProfileFixPreviewItem(suggestion: FlowProfileFixSuggestion): FlowProfileFixPreviewItem {
  const current = flowProfiles.getById(suggestion.targetId)
  const previewFields = Object.entries(suggestion.patch || {})
    .map(([k, nextValue]) => {
      const prevValue = current ? (current as unknown as Record<string, unknown>)[k] : undefined
      return {
        key: k,
        before: String(prevValue ?? '(空)'),
        after: String(nextValue ?? '(空)')
      } as FlowProfileFixFieldDiff
    })
  return {
    ...suggestion,
    previewText: previewFields.map(x => `${x.key}: ${x.before} -> ${x.after}`).join('；'),
    previewFields
  }
}

function openFlowProfileFixPreview(suggestions: FlowProfileFixSuggestion[]) {
  const list = (Array.isArray(suggestions) ? suggestions : [])
    .filter(item => item?.autoApplicable !== false && Object.keys(item?.patch || {}).length > 0)

  if (list.length === 0) {
    uni.showToast({ title: '暂无可应用修复', icon: 'none' })
    return
  }
  pendingFlowProfileFixSuggestions.value = list.map(toFlowProfileFixPreviewItem)
}

function cancelFlowProfileFixPreview() {
  pendingFlowProfileFixSuggestions.value = []
}

function confirmFlowProfileFixPreview() {
  const list = pendingFlowProfileFixSuggestions.value || []
  if (list.length === 0) {
    uni.showToast({ title: '暂无待应用修复', icon: 'none' })
    return
  }
  uni.showModal({
    title: '确认应用修复预览',
    content: `将应用 ${list.length} 条修复，是否继续？`,
    confirmText: '应用',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      list.forEach((item) => {
        patchFlowProfile(item.targetId, item.patch || {})
      })
      pendingFlowProfileFixSuggestions.value = []
      uni.showToast({ title: `已应用 ${list.length} 条修复`, icon: 'success' })
    }
  })
}

function applyFlowProfileFixSuggestion(suggestion: FlowProfileFixSuggestion) {
  if (!suggestion?.targetId) return
  if (suggestion.autoApplicable === false || Object.keys(suggestion.patch || {}).length === 0) {
    uni.showModal({
      title: '建议需手动处理',
      content: suggestion.reason || suggestion.summary || '该建议暂无自动修复补丁，请手动调整规则字段。',
      showCancel: false
    })
    return
  }
  openFlowProfileFixPreview([suggestion])
}

function applyAllFlowProfileFixSuggestions() {
  openFlowProfileFixPreview(flowProfileFixSuggestions.value || [])
}

function normalizeNullableText(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function formatFlowProfileSubmitValidation(validation: FlowProfileSubmitValidation, max = 6) {
  const lines: string[] = []
  const errors = validation?.errors || []
  const warnings = validation?.warnings || []
  const diagnostics = validation?.diagnostics

  if (errors.length > 0) {
    lines.push('错误：')
    errors.slice(0, max).forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`)
    })
    if (errors.length > max) lines.push(`... 另有 ${errors.length - max} 条错误`)
  }

  if (warnings.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push('提醒：')
    warnings.slice(0, max).forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`)
    })
    if (warnings.length > max) lines.push(`... 另有 ${warnings.length - max} 条提醒`)
  }

  if (diagnostics) {
    if (lines.length > 0) lines.push('')
    lines.push(`诊断汇总：冲突 ${diagnostics.conflicts.length}，死规则 ${diagnostics.deadRules.length}，弱覆盖 ${diagnostics.weakCoverage.length}`)
  }

  if (lines.length === 0) return '路由诊断未通过，请检查规则配置。'
  return lines.join('\n')
}

function showFlowProfileSubmitBlocked(validation: FlowProfileSubmitValidation) {
  uni.showModal({
    title: '路由诊断未通过',
    content: formatFlowProfileSubmitValidation(validation),
    showCancel: false
  })
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
    showFlowProfileSubmitBlocked(result.validation)
    return false
  }
  return true
}

function validateModuleCommitBeforeSavePublish(payload: ModuleCommitValidationPayload): ModuleCommitValidationResult {
  const crossValidation = validateListeningChoiceModuleCommitCrossChecks({
    mode: payload.mode,
    template: demoBase.value,
    nextModule: payload.module,
    flowProfiles: flowProfileRules.value || [],
    moduleCatalog: flowModules.listListeningChoice()
  })
  if (crossValidation.ok) {
    clearCommitValidationIssues()
    return { ok: true, errors: [] }
  }
  const issues = (crossValidation.errors || []).map((item, index) => normalizeCommitValidationIssue({
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

const moduleLifecycle = useModuleLifecycle({
  draftModuleId,
  draftModuleVersion,
  draftModuleName,
  draftModuleNote,
  draftModuleDisplayRef,
  listeningChoiceDraft,
  flowProfileRules,
  patchFlowProfile,
  validateBeforeCommit: validateModuleCommitBeforeSavePublish,
  onCommitValidationFailed: handleModuleCommitValidationFailed
})
const {
  currentModuleStatus,
  currentModuleStatusLabel,
  currentModuleStatusHint,
  canSaveCurrentStandard,
  canPublishCurrentStandard,
  canArchiveCurrentStandard,
  flowProfilesMigratableToCurrentVersion,
  flowModulesArchivableToCurrentVersion
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
    showFlowProfileSubmitBlocked(result.validation)
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
    if (result.validation) showFlowProfileSubmitBlocked(result.validation)
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

function updateFlowProfileModuleId(id: string, value: string) {
  const nextId = normalizeNullableText(value) || LISTENING_CHOICE_STANDARD_FLOW_ID
  patchFlowProfile(id, { module: { id: nextId } })
}

function updateFlowProfileModuleVersion(id: string, value: unknown) {
  const nextVersion = Math.max(1, toInt(value || 1))
  patchFlowProfile(id, { module: { version: nextVersion } })
}

function bindProfileToDraftModule(id: string) {
  const ok = patchFlowProfile(id, {
    module: {
      id: draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID,
      version: Math.max(1, toInt(draftModuleVersion.value || 1))
    }
  })
  if (!ok) return
  uni.showToast({ title: '已绑定当前流程版本', icon: 'success' })
}

function bindProfileToModuleRef(id: string, ref: { id: string; version: number }) {
  patchFlowProfile(id, {
    module: {
      id: String(ref?.id || LISTENING_CHOICE_STANDARD_FLOW_ID),
      version: Math.max(1, toInt(ref?.version || 1))
    }
  })
}

function runOnboardingAction(actionKey: string) {
  if (actionKey === 'question_load_ctx') {
    loadRouteSimFromCurrentQuestion()
    return
  }
  if (actionKey === 'question_sync_ctx') {
    syncRouteSimToCurrentQuestion()
    return
  }
  if (actionKey === 'question_apply_standard') {
    applyStandardToCurrentQuestion()
    return
  }
  if (actionKey === 'flow_save_draft') {
    saveStandard()
    return
  }
  if (actionKey === 'flow_save_next') {
    saveStandardAsNextVersion()
    return
  }
  if (actionKey === 'flow_publish') {
    publishCurrentStandard()
    return
  }
  if (actionKey === 'routing_add_rule') {
    addFlowProfileRule()
    return
  }
  if (actionKey === 'routing_migrate') {
    migrateFlowProfilesToCurrentVersion()
    return
  }
  if (actionKey === 'routing_simulate') {
    loadRouteSimFromCurrentQuestion()
  }
}

function applyRoutePreset(kind: RoutePresetKind) {
  const targetModule = {
    id: String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID),
    version: Math.max(1, toInt(draftModuleVersion.value || 1))
  }

  if (kind === 'national_default') {
    uni.showModal({
      title: '应用路由预置：全国通用',
      content: '将重置为单条默认路由并绑定当前流程版本。是否继续？',
      confirmText: '应用',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        flowProfiles.resetToDefault()
        patchFlowProfile('profile:listening_choice:default', {
          module: targetModule,
          priority: 0,
          enabled: true,
          note: '全国通用默认路由'
        })
        uni.showToast({ title: '已应用全国通用预置', icon: 'success' })
      }
    })
    return
  }

  if (kind === 'region_scene_demo') {
    uni.showModal({
      title: '应用路由预置：地区+场景示例',
      content: '将创建“地区/场景”示例规则并重置现有路由。是否继续？',
      confirmText: '应用',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        const ts = Date.now()
        const presetRules: FlowProfileV1[] = [
          {
            id: 'profile:listening_choice:default',
            questionType: 'listening_choice',
            region: undefined,
            scene: undefined,
            grade: undefined,
            module: targetModule,
            priority: 0,
            enabled: true,
            note: '全国通用兜底规则'
          },
          {
            id: `profile:listening_choice:preset:region:${ts}`,
            questionType: 'listening_choice',
            region: '广东',
            scene: '中考',
            grade: '九年级',
            module: targetModule,
            priority: 120,
            enabled: true,
            note: '地区优先示例：广东中考'
          },
          {
            id: `profile:listening_choice:preset:scene:${ts}`,
            questionType: 'listening_choice',
            region: undefined,
            scene: '模考',
            grade: '九年级',
            module: targetModule,
            priority: 80,
            enabled: true,
            note: '场景优先示例：九年级模考'
          }
        ]
        flowProfiles.resetToDefault()
        let okCount = 0
        for (const profile of presetRules) {
          const result = flowProfiles.upsertWithDiagnostics(profile)
          if (result.ok) okCount += 1
        }
        if (okCount < presetRules.length) {
          showFlowProfileSubmitBlocked(flowProfiles.validateBeforeSubmit('listening_choice'))
          uni.showToast({ title: '预置应用失败，请检查路由诊断', icon: 'none' })
          return
        }
        uni.showToast({ title: '已应用地区+场景预置', icon: 'success' })
      }
    })
  }
}

const visualPreviewOverrideSteps = ref<ListeningChoiceQuestion['flow']['steps'] | null>(null)
const hasVisualPreviewOverride = computed(() => {
  return Array.isArray(visualPreviewOverrideSteps.value) && visualPreviewOverrideSteps.value.length > 0
})

const demoQuestion = computed<ListeningChoiceQuestion>(() => {
  const base = demoBase.value
  const module = toLegacyStandardModule({
    ...listeningChoiceDraft.value,
    id: draftModuleId.value,
    version: draftModuleVersion.value
  })
  const steps = materializeListeningChoiceStandardSteps(base, {
    generateId: makeStableIdFactory(),
    overrides: {},
    module
  }) as ListeningChoiceQuestion['flow']['steps']
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

const flowVisualEditor = useEditableFlowGraph(demoQuestion)
const flowVisualStencilItems = flowVisualEditor.stencilItems
const readonlyFlowVisualPropertyFields = flowVisualEditor.propertyFieldsForSelectedNode
const flowVisualDraggingKind = ref('')
const readonlyFlowVisualVisible = ref(false)
const readonlyFlowGraph = flowVisualEditor.graph
const readonlyFlowCompileResult = flowVisualEditor.compileResult
const readonlyFlowCompiledStepPreview = flowVisualEditor.compiledStepPreview
const canReadonlyFlowVisualUndo = flowVisualEditor.canUndo
const canReadonlyFlowVisualRedo = flowVisualEditor.canRedo
const readonlyFlowRecentlyMovedNodeId = flowVisualEditor.recentlyMovedNodeId
const readonlyFlowVisualActiveNodeId = flowVisualEditor.selectedNodeId
const readonlyFlowVisualActiveNode = flowVisualEditor.selectedNode

function openReadonlyFlowVisual() {
  readonlyFlowVisualVisible.value = true
  flowVisualEditor.reloadFromQuestion()
}

function closeReadonlyFlowVisual() {
  readonlyFlowVisualVisible.value = false
}

function selectReadonlyFlowVisualNode(id: string) {
  flowVisualEditor.selectNode(id)
}

function addReadonlyFlowVisualStep(kind: string) {
  flowVisualEditor.appendNode(kind)
}

function reorderReadonlyFlowVisualNode(payload: { sourceId: string; targetId: string; position: 'before' | 'after' }) {
  flowVisualEditor.reorderNodes(payload.sourceId, payload.targetId, payload.position)
}

function insertReadonlyFlowVisualStepNearNode(payload: { kind: string; targetId: string; position: 'before' | 'after' }) {
  flowVisualEditor.insertNodeNearTarget(payload.kind, payload.targetId, payload.position)
}

function undoReadonlyFlowVisual() {
  flowVisualEditor.undo()
}

function redoReadonlyFlowVisual() {
  flowVisualEditor.redo()
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
  flowVisualEditor.appendNode(kind)
  flowVisualDraggingKind.value = ''
}

function patchReadonlyFlowVisualNode(patch: FlowVisualNodePatch) {
  flowVisualEditor.patchSelectedNode(patch)
}

function removeReadonlyFlowVisualNode() {
  flowVisualEditor.removeSelectedNode()
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
  visualPreviewOverrideSteps.value = buildPreviewStepsFromVisual(readonlyFlowCompileResult.value.steps)
  uni.showToast({ title: '已应用到预览', icon: 'success' })
}

function clearReadonlyFlowVisualPreviewOverride() {
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

  const nextDraft = clone(toLegacyStandardModule({
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

    visualPreviewOverrideSteps.value = null
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

const previewAnswers = ref<Record<string, string | string[]>>({})
const showAnswer = ref(false)
const currentStepIndex = ref(0)
const configStepIndex = ref(0)

const previewTotalSteps = computed(() => Number(demoQuestion.value.flow?.steps?.length || 0))
type ListeningChoiceFlowStep = ListeningChoiceQuestion['flow']['steps'][number]
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
  if (previewTotalSteps.value <= 0) return '-'
  return `${currentStepIndex.value + 1}/${previewTotalSteps.value}（${flowCenterCurrentStepKind.value}）`
})
const flowCenterAutoNextCode = computed(() => String(flowCenterCurrentStep.value?.autoNext || ''))
const flowCenterAutoNextReasonText = computed(() => formatAutoNextReason(flowCenterAutoNextCode.value))
const flowCenterHitRuleText = computed(() => {
  if (!simulatedProfile.value) return '未命中路由规则'
  const note = simulatedProfile.value.note || '未命名'
  return `${simulatedProfile.value.id}（${note}）`
})
const flowCenterHitModuleVersionText = computed(() => {
  const ref = simulatedProfile.value?.module
  if (!ref) return '未命中流程模块'
  return formatModuleDisplayRef(ref)
})
const flowCenterRouteSignature = computed(() => {
  const region = normalizeNullableText(routeSimRegion.value) || '-'
  const scene = normalizeNullableText(routeSimScene.value) || '-'
  const grade = normalizeNullableText(routeSimGrade.value) || '-'
  const profileId = simulatedProfile.value?.id || '-'
  const moduleRef = flowCenterHitModuleVersionText.value
  const score = String(simulatedBestCandidate.value?.totalScore || 0)
  return [region, scene, grade, profileId, moduleRef, score].join('|')
})
const flowCenterStepSignature = computed(() => {
  return [
    String(currentStepIndex.value),
    flowCenterCurrentStepKind.value,
    flowCenterAutoNextCode.value,
    String(previewTotalSteps.value)
  ].join('|')
})

function syncFlowCenterDebugMeta() {
  runtimeDebug.ensureSession(flowCenterDebugSessionId, {
    mode: 'flow_center',
    questionId: String(demoQuestion.value?.id || ''),
    questionType: String(demoQuestion.value?.type || 'listening_choice'),
    sourceKind: 'route_sim',
    profileId: simulatedProfile.value?.id || '',
    moduleId: String(simulatedProfile.value?.module?.id || ''),
    moduleDisplayRef: flowCenterHitModuleVersionText.value,
    moduleVersionText: simulatedProfile.value?.module ? `v${Math.max(1, toInt(simulatedProfile.value.module.version || 1))}` : '-',
    moduleNote: String(simulatedModule.value?.note || ''),
    currentStep: flowCenterCurrentStepText.value,
    currentStepKind: flowCenterCurrentStepKind.value,
    autoNext: flowCenterAutoNextCode.value || '-',
    autoNextReason: flowCenterAutoNextReasonText.value,
    ctx: {
      region: normalizeNullableText(routeSimRegion.value),
      scene: normalizeNullableText(routeSimScene.value),
      grade: normalizeNullableText(routeSimGrade.value)
    }
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
})

watch(flowCenterRouteSignature, (next, prev) => {
  syncFlowCenterDebugMeta()
  if (!next || next === prev) return
  runtimeDebug.record(flowCenterDebugSessionId, {
    type: 'route',
    message: `命中规则：${flowCenterHitRuleText.value} -> ${flowCenterHitModuleVersionText.value}`,
    payload: {
      profileId: simulatedProfile.value?.id || '',
      moduleVersion: simulatedProfile.value?.module?.version || 0,
      totalScore: simulatedBestCandidate.value?.totalScore || 0
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

watch(previewTotalSteps, (n) => {
  if (!Number.isFinite(n) || n <= 0) {
    currentStepIndex.value = 0
    configStepIndex.value = -1
    return
  }
  if (currentStepIndex.value > n - 1) currentStepIndex.value = n - 1
  if (configStepIndex.value > n - 1) configStepIndex.value = n - 1
})

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
  getPerGroupBool,
  patchPerGroupStep,
  setPerGroupAudioSource,
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
  if (kind === 'answerChoice') {
    quickAddPerGroupStep('answerChoice')
  }
}

function syncDraftModuleMeta(module: unknown) {
  const mod = isObjectRecord(module) ? module : {}
  const id = String(mod.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
  draftModuleName.value = normalizeModuleName(mod.name, moduleNameFallbackById(id))
  draftModuleNote.value = normalizeModuleNote(mod.note)
}

function goHome() {
  page.value = 'home'
}

function openListeningChoice() {
  const module = getDefaultModule()
  draftModuleId.value = String(module.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
  draftModuleVersion.value = Number(module.version || 1)
  syncDraftModuleMeta(module)
  listeningChoiceDraft.value = clone(toLegacyStandardModule(module))
  previewAnswers.value = {}
  showAnswer.value = false
  currentStepIndex.value = 0
  configStepIndex.value = 0
  page.value = 'listening_choice'
}

function reloadDemoBaseFromTemplate() {
  previewAnswers.value = {}
  currentStepIndex.value = 0
  configStepIndex.value = 0
  uni.showToast({ title: '已同步最新题型模板', icon: 'none' })
}

function toastWip(name: string) {
  uni.showToast({ title: `${name}：开发中`, icon: 'none' })
}

function showPublishLogs() {
  moduleLifecycle.showPublishLogs()
}

function saveStandard(skipWarningCheck = false, skipImpactCheck = false, targetVersion?: number) {
  moduleLifecycle.saveStandard(skipWarningCheck, skipImpactCheck, targetVersion)
}

function saveStandardAsNextVersion() {
  moduleLifecycle.saveStandardAsNextVersion()
}

function publishCurrentStandard(skipWarningCheck = false, skipImpactCheck = false) {
  moduleLifecycle.publishCurrentStandard(skipWarningCheck, skipImpactCheck)
}

function archiveCurrentStandard() {
  moduleLifecycle.archiveCurrentStandard()
}

function migrateFlowProfilesToCurrentVersion() {
  moduleLifecycle.migrateFlowProfilesToCurrentVersion()
}

function archiveHistoricalStandards() {
  moduleLifecycle.archiveHistoricalStandards()
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

    if (data?.type !== 'listening_choice') {
      uni.showToast({ title: '当前题目不是听后选择', icon: 'none' })
      return
    }

    const module = toLegacyStandardModule({
      ...listeningChoiceDraft.value,
      id: draftModuleId.value,
      version: draftModuleVersion.value
    })
    const steps = materializeListeningChoiceStandardSteps(data, { generateId, overrides: {}, module })

    const next = patchListeningChoiceQuestionFlow(
      data as ListeningChoiceQuestion,
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

function applyLibraryToCurrentQuestion(moduleId: string) {
  try {
    const data = getCurrentQuestionSnapshot()
    if (!data) {
      uni.showToast({ title: '当前没有题目', icon: 'none' })
      return
    }

    if (data?.type !== 'listening_choice') {
      uni.showToast({ title: '当前题目不是听后选择', icon: 'none' })
      return
    }

    const mod = flowLibrary.getById(moduleId)
    if (!mod || !Array.isArray(mod.steps)) {
      uni.showToast({ title: '流程模块不存在', icon: 'none' })
      return
    }

    const steps = materializeListeningChoiceTemplateSteps(data, mod.steps, { generateId })
    const next = patchListeningChoiceQuestionFlow(
      data as ListeningChoiceQuestion,
      { kind: 'library', id: mod.id },
      steps
    )

    persistCurrentQuestion(next)
    appShell.switchModule('editor')
    uni.showToast({ title: '已套用自定义流程', icon: 'success' })
  } catch (e) {
    console.error('Failed to apply library flow', e)
    uni.showToast({ title: '套用失败', icon: 'none' })
  }
}

function summarizeSteps(steps: Array<{ kind?: unknown }> | unknown[]): string {
  if (!Array.isArray(steps) || steps.length === 0) return '无步骤'
  const kinds = steps.map((s) => {
    if (!isObjectRecord(s)) return ''
    return String(s.kind || '')
  }).filter(Boolean)
  const shown = kinds.slice(0, 10).join(' → ')
  const more = kinds.length > 10 ? ` ...(+${kinds.length - 10})` : ''
  return shown + more
}

function jumpToStep(index: number) {
  const next = Math.max(0, Math.min(previewTotalSteps.value - 1, index))
  currentStepIndex.value = next
  if (configStepIndex.value === next) {
    configStepIndex.value = -1
    return
  }
  configStepIndex.value = next
}

function previewPrevStep() {
  jumpToStep(currentStepIndex.value - 1)
}

function previewNextStep() {
  jumpToStep(currentStepIndex.value + 1)
}

function onPreviewStepChange(step: number) {
  jumpToStep(step)
}

function findSubQuestionById(q: ListeningChoiceQuestion, id: string): SubQuestion | null {
  for (const g of q.content.groups || []) {
    for (const sq of g.subQuestions || []) {
      if (sq.id === id) return sq
    }
  }
  return null
}

function onPreviewSelect(subQuestionId: string, optionKey: string) {
  const q = demoQuestion.value
  const sq = findSubQuestionById(q, subQuestionId)
  if (!sq) return

  const mode = sq.answerMode === 'multiple' ? 'multiple' : 'single'
  const current = previewAnswers.value[subQuestionId]

  if (mode === 'multiple') {
    const list = Array.isArray(current) ? [...current] : []
    const idx = list.indexOf(optionKey)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(optionKey)
    previewAnswers.value = { ...previewAnswers.value, [subQuestionId]: list }
    return
  }

  previewAnswers.value = { ...previewAnswers.value, [subQuestionId]: optionKey }
}
</script>

<style lang="scss" scoped>
.flow-center {
  height: 100%;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(1200px 520px at 12% -10%, rgba(33, 150, 243, 0.10), rgba(255, 255, 255, 0) 60%),
    radial-gradient(900px 420px at 92% 0%, rgba(255, 152, 0, 0.06), rgba(255, 255, 255, 0) 55%),
    linear-gradient(180deg, #f7f9fc, #eef2f7);
}

.flow-center__header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  min-width: 0;
}

.header-titles {
  min-width: 0;
}

.title {
  font-size: 18px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
}

.subtitle {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.85);
}

.back__icon {
  color: rgba(15, 23, 42, 0.70);
  font-size: 14px;
}

.back__text {
  color: rgba(15, 23, 42, 0.82);
  font-size: 13px;
  font-weight: 700;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.flow-center__body {
  flex: 1;
  min-height: 0;
  height: 0;
  padding: 18px;
  box-sizing: border-box;
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.flow-card {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 16px;
  padding: 14px 14px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  transition: transform 0.14s, box-shadow 0.14s, border-color 0.14s;
}

.flow-card:active {
  transform: translateY(1px);
}

.flow-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.flow-card__icon {
  font-size: 22px;
}

.flow-card__badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.78);
  background: rgba(15, 23, 42, 0.06);
}

.badge--muted {
  color: rgba(15, 23, 42, 0.55);
  background: rgba(15, 23, 42, 0.05);
}

.flow-card__title {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
}

.flow-card__desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.60);
  line-height: 1.55;
}

.flow-card__meta {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(15, 23, 42, 0.55);
  font-size: 12px;
}

.meta-dot {
  color: rgba(15, 23, 42, 0.28);
}

.flow-card--disabled {
  opacity: 0.62;
}

.flow-center__detail {
  flex: 1;
  min-height: 0;
  height: 0;
}

.detail-body {
  height: 100%;
  display: flex;
  gap: 12px;
  padding: 12px 12px 14px;
  box-sizing: border-box;
}

.col {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.col--template {
  flex: 1.1 1 0;
  min-width: 360px;
  max-width: 560px;
}

.col--flow {
  flex: 1.4 1 0;
}

.col--preview {
  flex: 1 1 0;
  max-width: 460px;
  min-width: 320px;
}

.col-scroll {
  flex: 1;
  min-height: 0;
}

.panel {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.90);
  overflow: hidden;
  margin-bottom: 12px;
}

.panel--focus {
  border-color: rgba(239, 68, 68, 0.38);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.10);
}

.panel--blocking {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(254, 242, 242, 0.88);
}

.panel--guide {
  border-color: rgba(59, 130, 246, 0.24);
  background: rgba(239, 246, 255, 0.72);
}

.panel__header {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: rgba(248, 250, 252, 0.86);
}

.panel__header--blocking {
  border-bottom-color: rgba(239, 68, 68, 0.22);
  background: rgba(254, 226, 226, 0.72);
}

.panel__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.panel__header-actions .btn.is-active {
  border-color: rgba(59, 130, 246, 0.5);
  color: #0b63c6;
  background: rgba(219, 234, 254, 0.86);
}

.panel__title {
  font-size: 14px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
}

.panel__desc {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.module-state {
  margin-top: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.module-state__ref {
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.72);
}

.module-state__tag {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(15, 23, 42, 0.12);
  color: rgba(15, 23, 42, 0.62);
  background: rgba(15, 23, 42, 0.04);
}

.module-state__tag.is-draft {
  border-color: rgba(250, 173, 20, 0.45);
  color: #8a6200;
  background: rgba(250, 173, 20, 0.12);
}

.module-state__tag.is-published {
  border-color: rgba(46, 125, 50, 0.45);
  color: #1f6f2b;
  background: rgba(76, 175, 80, 0.12);
}

.module-state__tag.is-archived {
  border-color: rgba(15, 23, 42, 0.2);
  color: rgba(15, 23, 42, 0.5);
  background: rgba(15, 23, 42, 0.06);
}

.module-state__hint {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
}

.module-state__id {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
}

.module-meta-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.panel__body {
  padding: 14px;
}

.panel__body--template {
  padding: 10px 12px;
}

.diagram-hint {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px dashed rgba(15, 23, 42, 0.14);
  background: rgba(255, 255, 255, 0.70);
}

.diagram-hint__text {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.60);
}

.onboarding {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.onboarding__stage {
  font-size: 13px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.9);
}

.onboarding__desc {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.62);
}

.onboarding__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.onboarding__item {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.68);
  line-height: 1.55;
}

.onboarding__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.onboarding__preset {
  border: 1px dashed rgba(59, 130, 246, 0.28);
  border-radius: 10px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.72);
}

.onboarding__preset-title {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.74);
}

.onboarding__preset-actions {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.quick-add-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.step-config {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.node-config {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 12px;
  padding: 10px 10px 8px;
  background: rgba(248, 250, 252, 0.9);
}

.node-config__head {
  margin-bottom: 8px;
}

.node-config__title {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.86);
}

.node-config__desc {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
}

.form-item {
  margin-bottom: 0;
}

.form-item--grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.form-item--full {
  grid-column: 1 / -1;
}

.form-item__label {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.68);
  margin-bottom: 6px;
}

.form-item__value-hint {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.56);
  line-height: 1.45;
}

.text-input {
  width: 100%;
  height: 36px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  padding: 0 12px;
  font-size: 14px;
  background: rgba(248, 250, 252, 0.9);
}

.textarea-input {
  width: 100%;
  min-height: 72px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.5;
  background: rgba(248, 250, 252, 0.9);
  box-sizing: border-box;
}

.toggle {
  height: 36px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(15, 23, 42, 0.62);
  background: #fff;
}

.toggle.active {
  border-color: rgba(33, 150, 243, 0.55);
  color: #0b63c6;
  background: rgba(227, 242, 253, 0.95);
}

.mode-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-btn {
  height: 36px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(15, 23, 42, 0.64);
  background: #fff;
  font-size: 12px;
  font-weight: 700;
}

.mode-btn.active {
  border-color: rgba(33, 150, 243, 0.55);
  color: #0b63c6;
  background: rgba(227, 242, 253, 0.95);
}

.empty-tip {
  padding: 12px;
  color: $text-hint;
  font-size: 12px;
}

.step-config > .empty-tip {
  grid-column: 1 / -1;
}

.step-structure {
  grid-column: 1 / -1;
  border-top: 1px dashed rgba(15, 23, 42, 0.14);
  margin-top: 2px;
  padding-top: 8px;
}

.step-structure__label {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.60);
  margin-bottom: 6px;
}

.step-structure__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-card {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.82);
}

.profile-card.is-focus {
  border-color: rgba(239, 68, 68, 0.42);
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.12);
}

.profile-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.profile-card__id {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.62);
}

.profile-card__module {
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.78);
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.profile-ref-list {
  margin-top: 8px;
}

.profile-ref-list__label {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.62);
  margin-bottom: 6px;
}

.profile-ref-list__chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.profile-chip {
  padding: 5px 8px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 999px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.62);
  background: rgba(255, 255, 255, 0.9);
}

.profile-chip.active {
  border-color: rgba(33, 150, 243, 0.5);
  color: #0b63c6;
  background: rgba(227, 242, 253, 0.95);
}

.profile-card__actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.blocking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.blocking-item {
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 10px;
}

.blocking-item.active {
  border-color: rgba(239, 68, 68, 0.45);
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.12);
}

.blocking-item__loc {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #991b1b;
}

.blocking-item__msg {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.72);
  line-height: 1.45;
}

.blocking-item__path {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.5);
}

.blocking-item__actions {
  margin-top: 6px;
  display: flex;
  justify-content: flex-end;
}

.route-check {
  margin-top: 12px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.82);
  padding: 10px;
}

.route-check__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.route-check__title {
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.84);
}

.route-check__meta {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
}

.route-check__section {
  margin-top: 8px;
}

.route-check__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.route-check__preview-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.route-check__section-title {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.72);
  margin-bottom: 4px;
}

.route-check__ok {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.52);
}

.route-check__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.route-check__item {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.88);
  padding: 6px 8px;
}

.route-check__item-main {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.7);
}

.route-check__item-sub {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.52);
}

.route-check__item-actions {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.route-check__manual-tip {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.5);
}

.route-check__preview-fields {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.route-check__preview-field {
  border: 1px dashed rgba(15, 23, 42, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.85);
  padding: 5px 6px;
}

.route-check__preview-key {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.66);
}

.route-check__preview-before,
.route-check__preview-after {
  display: block;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
  margin-top: 2px;
}

.route-sim {
  margin-top: 12px;
  border-top: 1px dashed rgba(15, 23, 42, 0.14);
  padding-top: 10px;
}

.route-sim__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.route-sim__head-main {
  min-width: 0;
}

.route-sim__head-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.route-sim__title {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.86);
}

.route-sim__desc {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
}

.route-sim__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.route-sim__result {
  margin-top: 10px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 10px;
  padding: 8px 10px;
  background: rgba(248, 250, 252, 0.8);
}

.route-sim__result-title {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.78);
  margin-bottom: 4px;
}

.route-sim__line {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.65);
  line-height: 1.5;
}

.route-sim__result--soft {
  background: rgba(255, 255, 255, 0.78);
}

.route-sim__rank-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.route-sim__rank-item {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.7);
  padding: 6px 8px;
}

.route-sim__rank-main {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.72);
}

.route-sim__rank-sub {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.54);
}

.flow-diagnostics {
  margin-top: 10px;
  border: 1px solid rgba(2, 132, 199, 0.22);
  border-radius: 10px;
  background: rgba(240, 249, 255, 0.72);
  padding: 8px 10px;
}

.flow-diagnostics__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.flow-diagnostics__head-main {
  min-width: 0;
}

.flow-diagnostics__head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.flow-diagnostics__title {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.86);
}

.flow-diagnostics__desc {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.56);
}

.flow-diagnostics__grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 3px;
}

.flow-diagnostics__line {
  display: block;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.7);
  line-height: 1.5;
}

.flow-diagnostics__trace {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(15, 23, 42, 0.14);
}

.flow-diagnostics__trace-title {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.64);
}

.flow-diagnostics__trace-list {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flow-diagnostics__trace-item {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 5px 7px;
}

.flow-diagnostics__trace-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.flow-diagnostics__trace-time {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.46);
}

.flow-diagnostics__trace-type {
  font-size: 11px;
  color: rgba(2, 132, 199, 0.9);
  font-weight: 700;
}

.flow-diagnostics__trace-text {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: rgba(15, 23, 42, 0.66);
  line-height: 1.5;
}

.flow-visual-modal {
  position: fixed;
  inset: 0;
  z-index: 340;
}

.flow-visual-modal__mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.44);
}

.flow-visual-modal__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(980px, 92vw);
  height: min(700px, 88vh);
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.flow-visual-modal__header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.1);
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.flow-visual-modal__title-wrap {
  min-width: 0;
}

.flow-visual-modal__title {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.9);
}

.flow-visual-modal__desc {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.flow-visual-modal__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.flow-visual-modal__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 300px;
}

.flow-visual-stencil-pane {
  border-right: 1px solid rgba(15, 23, 42, 0.1);
  padding: 12px;
  background: rgba(248, 250, 252, 0.86);
  overflow: auto;
}

.flow-visual-canvas-dropzone {
  min-height: 0;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(241, 245, 249, 0.94));
}

.flow-visual-canvas-wrap {
  min-height: 0;
  padding: 14px;
  box-sizing: border-box;
  background: transparent;
}

.flow-visual-detail {
  border-left: 1px solid rgba(15, 23, 42, 0.1);
  padding: 12px;
  background: rgba(248, 250, 252, 0.88);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flow-visual-detail__title {
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.82);
}

.flow-visual-detail__line {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.66);
  line-height: 1.45;
}

.flow-visual-compile {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(15, 23, 42, 0.16);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flow-visual-compile__status {
  font-size: 12px;
  font-weight: 700;
}

.flow-visual-compile__status.is-ok {
  color: rgba(5, 150, 105, 0.9);
}

.flow-visual-compile__status.is-error {
  color: rgba(220, 38, 38, 0.9);
}

.flow-visual-compile__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.library-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lib-card {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  background: rgba(255, 255, 255, 0.95);
}

.lib-card__main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lib-card__title {
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.88);
  word-break: break-all;
}

.lib-card__meta {
  font-size: 11px;
  color: rgba(15, 23, 42, 0.55);
}

.lib-card__steps {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.65);
  word-break: break-word;
}

.lib-card__ops {
  flex-shrink: 0;
}

@media (max-width: 1100px) {
  .detail-body {
    flex-direction: column;
  }

  .route-sim__grid {
    grid-template-columns: 1fr;
  }

  .col--template {
    max-width: none;
    min-width: 0;
  }

  .col--preview {
    max-width: none;
    min-width: 0;
  }

  .flow-visual-modal__body {
    grid-template-columns: 1fr;
  }

  .flow-visual-stencil-pane {
    border-right: 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.1);
  }

  .flow-visual-detail {
    border-left: 0;
    border-top: 1px solid rgba(15, 23, 42, 0.1);
  }

}
</style>
