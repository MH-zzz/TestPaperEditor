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

            <view class="panel">
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
                  <button class="btn btn-outline btn-xs" @click="addFlowProfileRule">新增路由</button>
                  <button class="btn btn-outline btn-xs" @click="resetFlowProfileRules">重置路由</button>
                </view>
              </view>
              <view class="panel__body">
                <view v-if="flowProfileRules.length === 0" class="empty-tip">暂无路由规则</view>

                <view v-else class="profile-list">
                  <view v-for="profile in flowProfileRules" :key="profile.id" class="profile-card">
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
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FlowModuleStatus, FlowProfileV1, ListeningChoiceQuestion, SubQuestion } from '/types'
import ListeningChoiceEditor from '/components/editor/ListeningChoiceEditor.vue'
import ListeningChoiceFlowDiagram from '/components/editor/ListeningChoiceFlowDiagram.vue'
import FlowStepQuickAdd from '/components/editor/FlowStepQuickAdd.vue'
import PhonePreviewPanel from '/components/layout/PhonePreviewPanel.vue'
import { contentTemplates } from '/stores/contentTemplates'
import { flowLibrary } from '/stores/flowLibrary'
import { flowModules } from '/stores/flowModules'
import { flowProfiles } from '/stores/flowProfiles'
import { questionDraft } from '/stores/questionDraft'
import { appShell } from '/stores/appShell'
import {
  type FlowModulePublishLogRecord,
  loadFlowModulePublishLogs as loadFlowModulePublishLogsFromRepository,
  saveFlowModulePublishLogs as saveFlowModulePublishLogsToRepository
} from '/infra/repository/flowModuleRepository'
import {
  patchListeningChoiceQuestionFlow,
  patchQuestionFlowContext,
  readQuestionFlowContext
} from './flow-modules/currentQuestionBridge'
import { generateId } from '/templates'
import { buildModuleDiffSummary, formatModuleDiffSummary } from '/domain/flow-module/usecases/buildModuleDiffSummary'
import {
  buildFlowProfileFixSuggestions as buildFlowProfileFixSuggestionsUsecase,
  canSubmitFlowProfiles,
  diagnoseFlowProfileRules as diagnoseFlowProfileRulesUsecase,
  scoreProfiles as scoreProfilesUsecase,
  type FlowProfileScoreDetail as FlowProfileScoreDetailUsecase,
  type FlowProfileDiagnostics as FlowProfileDiagnosticsUsecase,
  type FlowProfileFixSuggestion as FlowProfileFixSuggestionUsecase,
  type FlowProfileSubmitValidation
} from '/domain/flow-profile/usecases/scoreProfiles'
import {
  DEFAULT_LISTENING_CHOICE_STANDARD_MODULE,
  LISTENING_CHOICE_STANDARD_FLOW_ID,
  type ListeningChoiceStandardPerGroupStepDef,
  materializeListeningChoiceStandardSteps,
  materializeListeningChoiceTemplateSteps,
  validateListeningChoiceStandardModule
} from '../../flows/listeningChoiceFlowModules'

type Page = 'home' | 'listening_choice'
type PerGroupKind = 'playAudio' | 'countdown' | 'promptTone' | 'answerChoice'
type AudioSource = 'description' | 'content'
type QuickAddPerGroupKind = 'playAudioDescription' | 'playAudioContent' | 'countdown' | 'promptTone' | 'answerChoice'
const DEFAULT_LISTENING_CHOICE_MODULE_NAME = '听后选择标准'

type FlowModulePublishLog = FlowModulePublishLogRecord

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function getCurrentQuestionSnapshot() {
  const current = questionDraft.state.currentQuestion
  if (!current || typeof current !== 'object') return null
  return clone(current)
}

function persistCurrentQuestion(next: ListeningChoiceQuestion | Record<string, any>) {
  questionDraft.updateDraft(next as any, { persistDraft: true })
}

function nowIso() {
  return new Date().toISOString()
}

function makeStableIdFactory(prefix = 'demo_step') {
  let i = 0
  return () => `${prefix}_${++i}`
}

function toInt(v: any): number {
  const n = parseInt(String(v || '0'), 10)
  return Number.isFinite(n) ? n : 0
}

function normalizeText(v: any): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s || undefined
}

function normalizeModuleName(name: any, fallback = DEFAULT_LISTENING_CHOICE_MODULE_NAME): string {
  return normalizeText(name) || fallback
}

function normalizeModuleNote(note: any): string {
  return normalizeText(note) || ''
}

function moduleNameFallbackById(id: string): string {
  return id === LISTENING_CHOICE_STANDARD_FLOW_ID ? DEFAULT_LISTENING_CHOICE_MODULE_NAME : id
}

function formatModuleDisplayRef(refLike: any): string {
  const id = String(refLike?.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
  const version = Math.max(1, toInt(refLike?.version || 1))
  const hit = flowModules.getListeningChoiceByRef({ id, version } as any)
  const name = normalizeModuleName(refLike?.name || hit?.name, moduleNameFallbackById(id))
  return `${name} @ v${version}`
}

function normalizeModuleStatus(v: any): FlowModuleStatus {
  if (v === 'draft' || v === 'published' || v === 'archived') return v
  return 'draft'
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    intro: '介绍页',
    countdown: '倒计时',
    playAudio: '播放音频',
    promptTone: '提示音',
    answerChoice: '开始答题',
    groupPrompt: '题组提示',
    finish: '完成页'
  }
  return map[kind] || kind
}

function perGroupKindLabel(kind: PerGroupKind, audioSource?: AudioSource): string {
  if (kind === 'playAudio') return audioSource === 'description' ? '播放描述音频' : '播放正文音频'
  if (kind === 'countdown') return '倒计时'
  if (kind === 'promptTone') return '提示音'
  return '开始答题'
}

function createPerGroupStep(kind: QuickAddPerGroupKind): ListeningChoiceStandardPerGroupStepDef {
  if (kind === 'playAudioDescription') {
    return { kind: 'playAudio', showTitle: true, audioSource: 'description' }
  }
  if (kind === 'playAudioContent') {
    return { kind: 'playAudio', showTitle: true, audioSource: 'content' }
  }
  if (kind === 'countdown') {
    return { kind: 'countdown', showTitle: true, seconds: 3, label: '准备' }
  }
  if (kind === 'promptTone') {
    return { kind: 'promptTone', showTitle: true, url: '/static/audio/small_time.mp3' }
  }
  return { kind: 'answerChoice', showTitle: true, showQuestionTitle: true, showQuestionTitleDescription: true, showGroupPrompt: true }
}

function calcPerGroupOffset(): number {
  const steps: any[] = demoQuestion.value.flow?.steps || []
  let offset = 0
  if (steps[0]?.kind === 'intro') offset += 1
  if (steps[1]?.kind === 'countdown' && steps[0]?.kind === 'intro') offset += 1
  return offset
}

function flowIndexByPerGroupIndex(perGroupIndex: number): number {
  return calcPerGroupOffset() + Math.max(0, perGroupIndex)
}

function toLegacyStandardModule(moduleInput: any) {
  const m = moduleInput && typeof moduleInput === 'object' ? moduleInput : {}
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
  } as any
}

function getDefaultModule() {
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
  } as any
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
const draftModuleNote = ref(normalizeModuleNote((defaultModule as any)?.note))
const listeningChoiceDraft = ref(clone(toLegacyStandardModule(defaultModule)))
const draftModuleDisplayRef = computed(() => {
  const id = String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID)
  const fallbackName = id === LISTENING_CHOICE_STANDARD_FLOW_ID ? DEFAULT_LISTENING_CHOICE_MODULE_NAME : id
  const name = normalizeModuleName(draftModuleName.value, fallbackName)
  const version = Math.max(1, toInt(draftModuleVersion.value || 1))
  return `${name} @ v${version}`
})
const currentModuleRef = computed(() => ({
  id: String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID),
  version: Math.max(1, toInt(draftModuleVersion.value || 1))
}))
const currentModule = computed(() => flowModules.getListeningChoiceByRef(currentModuleRef.value as any))
const currentModuleExists = computed(() => Boolean(currentModule.value))
const currentModuleStatus = computed<FlowModuleStatus>(() => normalizeModuleStatus(currentModule.value?.status))
const currentModuleStatusLabel = computed(() => {
  if (!currentModuleExists.value) return '新建草稿'
  if (currentModuleStatus.value === 'draft') return '草稿'
  if (currentModuleStatus.value === 'published') return '已发布'
  return '已归档'
})
const currentModuleStatusHint = computed(() => {
  if (!currentModuleExists.value) return '当前版本尚未创建，保存后将作为草稿；草稿发布后才能作为稳定版本使用。'
  if (currentModuleStatus.value === 'draft') return '草稿可持续编辑；发布后进入已发布状态。'
  if (currentModuleStatus.value === 'published') return '已发布版本不可直接覆盖；如需修改，请“另存新版本”后编辑草稿。'
  return '已归档版本只读且不会再命中新题；如需调整，请“另存新版本”。'
})
const canSaveCurrentStandard = computed(() => !currentModuleExists.value || currentModuleStatus.value === 'draft')
const canPublishCurrentStandard = computed(() => currentModuleExists.value && currentModuleStatus.value === 'draft')
const canArchiveCurrentStandard = computed(() => currentModuleExists.value && currentModuleStatus.value !== 'archived')
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
const flowProfileRules = computed<FlowProfileV1[]>(() => flowProfiles.listByQuestionType('listening_choice') as any)
const flowModuleRefOptions = computed(() => {
  return (flowModules.listListeningChoice() || []).filter((m: any) => m?.status === 'published')
})
const flowProfilesMigratableToCurrentVersion = computed<FlowProfileV1[]>(() => {
  const targetId = String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID)
  const targetVersion = Math.max(1, toInt(draftModuleVersion.value || 1))
  return (flowProfileRules.value || []).filter((profile) => {
    const moduleId = String(profile?.module?.id || '')
    const moduleVersion = Number(profile?.module?.version || 0)
    return moduleId === targetId && moduleVersion > 0 && moduleVersion !== targetVersion
  })
})
const routeSimRegion = ref('')
const routeSimScene = ref('')
const routeSimGrade = ref('')
const routeSimScoreResult = computed(() => {
  return scoreProfilesUsecase(flowProfileRules.value || [], {
    region: normalizeNullableText(routeSimRegion.value),
    scene: normalizeNullableText(routeSimScene.value),
    grade: normalizeNullableText(routeSimGrade.value)
  }, { topN: 5 })
})
const simulatedRankedCandidates = computed<FlowRuleScoreDetail[]>(() => {
  return routeSimScoreResult.value.rankedCandidates || []
})
const simulatedBestCandidate = computed<FlowRuleScoreDetail | null>(() => {
  return routeSimScoreResult.value.bestCandidate || null
})
const simulatedProfile = computed<FlowProfileV1 | null>(() => {
  return simulatedBestCandidate.value?.profile || null
})
const simulatedModule = computed(() => {
  const profile = simulatedProfile.value
  if (!profile?.module) return null
  return flowModules.getListeningChoiceByRef(profile.module as any)
})
const flowProfileDiagnostics = computed<FlowProfileDiagnosticsUsecase>(() => diagnoseFlowProfileRules(flowProfileRules.value || []))
const flowProfileFixSuggestions = computed(() => {
  return buildFlowProfileFixSuggestions(flowProfileDiagnostics.value, flowProfileRules.value || [])
})
const flowProfileSubmitValidation = computed<FlowProfileSubmitValidation>(() => {
  return canSubmitFlowProfiles(flowProfileRules.value || [])
})
const pendingFlowProfileFixSuggestions = ref<FlowProfileFixPreviewItem[]>([])
const flowModulePublishLogs = ref<FlowModulePublishLog[]>([])
loadFlowModulePublishLogs()

function loadRouteSimFromCurrentQuestion() {
  try {
    const data = getCurrentQuestionSnapshot()
    if (!data) {
      uni.showToast({ title: '当前没有题目', icon: 'none' })
      return
    }

    const ctx = readQuestionFlowContext(data)
    routeSimRegion.value = ctx.region
    routeSimScene.value = ctx.scene
    routeSimGrade.value = ctx.grade
    uni.showToast({ title: '已读取当前题目上下文', icon: 'success' })
  } catch (e) {
    console.error('Failed to load route simulator context from current question', e)
    uni.showToast({ title: '读取失败', icon: 'none' })
  }
}

function syncRouteSimToCurrentQuestion() {
  try {
    const data = getCurrentQuestionSnapshot()
    if (!data) {
      uni.showToast({ title: '当前没有题目', icon: 'none' })
      return
    }

    const next = patchQuestionFlowContext(data as any, {
      region: routeSimRegion.value,
      scene: routeSimScene.value,
      grade: routeSimGrade.value
    })
    persistCurrentQuestion(next)
    uni.showToast({ title: '已写回当前题目上下文', icon: 'success' })
  } catch (e) {
    console.error('Failed to sync route simulator context to current question', e)
    uni.showToast({ title: '写回失败', icon: 'none' })
  }
}

type FlowRuleScoreDetail = FlowProfileScoreDetailUsecase
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
      const prevValue = current ? (current as any)[k] : undefined
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

function normalizeNullableText(v: any): string | undefined {
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

function patchFlowProfile(id: string, patch: Record<string, any>) {
  const current = flowProfiles.getById(id)
  if (!current) return false
  const nextModule = patch.module ? { ...(current.module || {}), ...patch.module } : current.module
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

function updateFlowProfilePriority(id: string, value: any) {
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

function updateFlowProfileModuleVersion(id: string, value: any) {
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
  }) as any
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
      steps
    }
  }
})

const previewAnswers = ref<Record<string, string | string[]>>({})
const showAnswer = ref(false)
const currentStepIndex = ref(0)
const configStepIndex = ref(0)

const previewTotalSteps = computed(() => Number(demoQuestion.value.flow?.steps?.length || 0))

watch(previewTotalSteps, (n) => {
  if (!Number.isFinite(n) || n <= 0) {
    currentStepIndex.value = 0
    configStepIndex.value = -1
    return
  }
  if (currentStepIndex.value > n - 1) currentStepIndex.value = n - 1
  if (configStepIndex.value > n - 1) configStepIndex.value = n - 1
})

const introShowTitle = computed(() => listeningChoiceDraft.value?.introShowTitle !== false)
const introShowTitleDescription = computed(() => listeningChoiceDraft.value?.introShowTitleDescription !== false)
const introShowDescription = computed(() => listeningChoiceDraft.value?.introShowDescription !== false)
const introCountdownEnabled = computed(() => listeningChoiceDraft.value?.introCountdownEnabled !== false)
const introCountdownShowTitle = computed(() => listeningChoiceDraft.value?.introCountdownShowTitle !== false)
const introCountdownSeconds = computed(() => Math.max(0, toInt((listeningChoiceDraft.value as any)?.introCountdownSeconds ?? 3)))
const introCountdownLabel = computed(() => String((listeningChoiceDraft.value as any)?.introCountdownLabel || '准备'))
const flowQuickAddItems = computed(() => {
  const items: Array<{ key: string; label: string }> = []
  if (!introCountdownEnabled.value) {
    items.push({ key: 'introCountdown', label: '介绍倒计时' })
  }
  items.push({ key: 'playAudioDescription', label: '描述音频' })
  items.push({ key: 'playAudioContent', label: '正文音频' })
  items.push({ key: 'countdown', label: '倒计时' })
  items.push({ key: 'promptTone', label: '提示音' })
  items.push({ key: 'answerChoice', label: '开始答题' })
  return items
})

type SelectedConfig =
  | { type: 'intro' }
  | { type: 'intro_countdown' }
  | { type: 'per_group'; index: number; kind: 'playAudio' | 'countdown' | 'promptTone' | 'answerChoice' }
  | { type: 'other' }

function resolveConfigByFlowIndex(idx: number): SelectedConfig | null {
  const steps: any[] = demoQuestion.value.flow?.steps || []
  if (idx < 0) return null
  const step: any = steps[idx]
  if (!step) return null

  if (step.kind === 'intro') return { type: 'intro' }

  const prev: any = steps[idx - 1]
  if (step.kind === 'countdown' && prev?.kind === 'intro') return { type: 'intro_countdown' }

  const perGroupIndex = idx - calcPerGroupOffset()
  const def: any = listeningChoiceDraft.value?.perGroupSteps?.[perGroupIndex]
  const kind = String(def?.kind || '')
  if (kind === 'playAudio' || kind === 'countdown' || kind === 'promptTone' || kind === 'answerChoice') {
    return { type: 'per_group', index: perGroupIndex, kind: kind as any }
  }

  return { type: 'other' }
}

const selectedConfig = computed<SelectedConfig | null>(() => {
  return resolveConfigByFlowIndex(configStepIndex.value)
})

const reorderableFlowIndices = computed<number[]>(() => {
  const steps: any[] = demoQuestion.value.flow?.steps || []
  const indices: number[] = []
  for (let i = 0; i < steps.length; i += 1) {
    const cfg = resolveConfigByFlowIndex(i)
    if (cfg?.type === 'per_group') indices.push(i)
  }
  return indices
})

const selectedStepLabel = computed(() => {
  const step: any = (demoQuestion.value.flow?.steps || [])[configStepIndex.value]
  if (!step) return '请选择步骤'
  const config = selectedConfig.value
  if (config?.type === 'intro') return '介绍页配置'
  if (config?.type === 'intro_countdown') return '介绍页倒计时配置'
  if (config?.type === 'per_group') {
    const perStep: any = listeningChoiceDraft.value?.perGroupSteps?.[config.index]
    return `每题组流程 · ${perGroupKindLabel(config.kind, getAudioSource(perStep))}`
  }
  return kindLabel(String(step.kind || ''))
})

function syncDraftModuleMeta(module: any) {
  const id = String(module?.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
  draftModuleName.value = normalizeModuleName(module?.name, moduleNameFallbackById(id))
  draftModuleNote.value = normalizeModuleNote(module?.note)
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

function formatFlowModuleValidationIssues(items: Array<{ message: string }>, max = 5) {
  if (!Array.isArray(items) || items.length === 0) return ''
  const head = items.slice(0, max).map((item, idx) => `${idx + 1}. ${item.message}`)
  const more = items.length > max ? `\n... 另有 ${items.length - max} 条` : ''
  return `${head.join('\n')}${more}`
}

function getFlowModuleSaveImpact(target?: { id?: string; version?: number }) {
  const refId = String(target?.id || draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID)
  const refVersion = Math.max(1, toInt(target?.version || draftModuleVersion.value || 1))
  const matchedRules = (flowProfileRules.value || []).filter((p) => {
    return String(p?.module?.id || '') === refId && Number(p?.module?.version || 0) === refVersion
  })
  const enabledRules = matchedRules.filter(p => p?.enabled !== false)
  const exists = Boolean(flowModules.getListeningChoiceByRef({ id: refId, version: refVersion }))
  return {
    id: refId,
    version: refVersion,
    exists,
    matchedRuleCount: matchedRules.length,
    enabledRuleCount: enabledRules.length,
    matchedRules
  }
}

function formatFlowProfileImpactLines(rules: FlowProfileV1[], max = 6) {
  if (!Array.isArray(rules) || rules.length === 0) return '无'
  const lines = rules.slice(0, max).map((p) => {
    const status = p.enabled === false ? '停用' : '启用'
    const note = String(p.note || '').trim()
    const suffix = note ? `（${note}）` : ''
    return `- ${p.id}${suffix} [${status}]`
  })
  if (rules.length > max) lines.push(`- ... 另有 ${rules.length - max} 条`)
  return lines.join('\n')
}

function formatFlowProfileVersionSummary(rules: FlowProfileV1[]) {
  const map: Record<string, number> = {}
  ;(rules || []).forEach((p) => {
    const v = `v${Math.max(1, toInt(p?.module?.version || 1))}`
    map[v] = (map[v] || 0) + 1
  })
  return Object.entries(map)
    .sort((a, b) => Number(b[0].slice(1)) - Number(a[0].slice(1)))
    .map(([v, count]) => `${v} x ${count}`)
    .join('，')
}

function loadFlowModulePublishLogs() {
  try {
    const list = loadFlowModulePublishLogsFromRepository()
    flowModulePublishLogs.value = list
      .map((item: any) => ({
        id: String(item?.id || ''),
        createdAt: String(item?.createdAt || ''),
        moduleId: String(item?.moduleId || ''),
        moduleVersion: Math.max(1, toInt(item?.moduleVersion || 1)),
        moduleDisplayRef: String(item?.moduleDisplayRef || ''),
        summaryLines: Array.isArray(item?.summaryLines) ? item.summaryLines.map((x: any) => String(x || '')) : []
      }))
      .filter((item: FlowModulePublishLog) => item.id)
      .slice(0, 60)
  } catch (e) {
    console.error('Failed to load flow module publish logs', e)
    flowModulePublishLogs.value = []
  }
}

function persistFlowModulePublishLogs() {
  try {
    saveFlowModulePublishLogsToRepository(flowModulePublishLogs.value)
  } catch (e) {
    console.error('Failed to save flow module publish logs', e)
  }
}

function appendFlowModulePublishLog(log: Omit<FlowModulePublishLog, 'id' | 'createdAt'>) {
  const item: FlowModulePublishLog = {
    id: `flow_publish_${Date.now()}`,
    createdAt: nowIso(),
    moduleId: String(log.moduleId || ''),
    moduleVersion: Math.max(1, toInt(log.moduleVersion || 1)),
    moduleDisplayRef: String(log.moduleDisplayRef || ''),
    summaryLines: Array.isArray(log.summaryLines) ? log.summaryLines.map((x) => String(x || '')) : []
  }
  flowModulePublishLogs.value = [item, ...(flowModulePublishLogs.value || [])].slice(0, 60)
  persistFlowModulePublishLogs()
}

function showPublishLogs() {
  const logs = flowModulePublishLogs.value || []
  if (logs.length <= 0) {
    uni.showToast({ title: '暂无发布日志', icon: 'none' })
    return
  }

  const lines = logs.slice(0, 8).flatMap((item, index) => {
    const head = `${index + 1}. ${item.createdAt} · ${item.moduleDisplayRef || `${item.moduleId} @ v${item.moduleVersion}`}`
    const body = (item.summaryLines || []).slice(0, 4).map(line => `   ${line}`)
    return [head, ...body]
  })
  if (logs.length > 8) lines.push(`... 另有 ${logs.length - 8} 条`)

  uni.showModal({
    title: '发布日志',
    content: lines.join('\n'),
    showCancel: false
  })
}

function saveStandard(skipWarningCheck = false, skipImpactCheck = false, targetVersion?: number) {
  const effectiveVersion = Math.max(1, toInt(targetVersion || draftModuleVersion.value || 1))
  const targetRef = {
    id: String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID),
    version: effectiveVersion
  }
  const existing = flowModules.getListeningChoiceByRef(targetRef)

  if (existing?.status === 'archived') {
    uni.showModal({
      title: '归档版本只读',
      content: '当前版本已归档，不能直接保存。请使用“另存新版本”创建草稿后再编辑。',
      showCancel: false
    })
    return
  }

  if (existing?.status === 'published') {
    uni.showModal({
      title: '发布版本不可直接覆盖',
      content: '当前版本已发布。为保证可回溯，请使用“另存新版本”创建草稿版本进行修改。',
      showCancel: false
    })
    return
  }

  const moduleFallbackName = moduleNameFallbackById(targetRef.id)
  const moduleName = normalizeModuleName(draftModuleName.value, moduleFallbackName)
  const moduleNote = normalizeModuleNote(draftModuleNote.value)
  const draftPayload = {
    kind: 'listening_choice',
    id: targetRef.id,
    version: effectiveVersion,
    name: moduleName,
    note: moduleNote,
    status: 'draft',
    ...listeningChoiceDraft.value
  }
  const validation = validateListeningChoiceStandardModule(draftPayload)
  if (validation.errors.length > 0) {
    uni.showModal({
      title: '题型流程校验失败',
      content: formatFlowModuleValidationIssues(validation.errors),
      showCancel: false
    })
    return
  }

  if (!skipWarningCheck && validation.warnings.length > 0) {
    uni.showModal({
      title: '题型流程校验提醒',
      content: `${formatFlowModuleValidationIssues(validation.warnings)}\n\n是否仍然保存？`,
      confirmText: '仍然保存',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        saveStandard(true, skipImpactCheck, targetVersion)
      }
    })
    return
  }

  if (!skipImpactCheck) {
    const impact = getFlowModuleSaveImpact({ id: draftPayload.id, version: effectiveVersion })
    const actionLabel = impact.exists ? '覆盖草稿版本' : '创建草稿版本'
    const diffSummary = buildModuleDiffSummary({
      previousModule: existing || null,
      nextModule: draftPayload as any,
      impactRules: impact.matchedRules as any
    })
    const contentLines = [
      `本次将${actionLabel}：${moduleName}（${draftPayload.id} @ v${effectiveVersion}）`,
      `变更摘要：\n${formatModuleDiffSummary(diffSummary)}`,
      '是否继续保存？'
    ]
    if (moduleNote) contentLines.splice(1, 0, `流程备注：${moduleNote}`)
    const content = contentLines.join('\n')
    uni.showModal({
      title: '确认保存题型流程',
      content,
      confirmText: '确认保存',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        saveStandard(true, true, targetVersion)
      }
    })
    return
  }

  flowModules.upsertListeningChoice({
    ...draftPayload
  })
  const module = flowModules.getListeningChoiceByRef({
    id: draftModuleId.value,
    version: effectiveVersion
  })
  draftModuleVersion.value = effectiveVersion
  syncDraftModuleMeta(module || draftPayload)
  listeningChoiceDraft.value = clone(toLegacyStandardModule(module || getDefaultModule()))
  uni.showToast({ title: `已保存草稿 v${effectiveVersion}`, icon: 'success' })
}

function saveStandardAsNextVersion() {
  const moduleId = String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID)
  const currentVersion = Math.max(1, toInt(draftModuleVersion.value || 1))
  const maxVersion = flowModules.getListeningChoiceMaxVersion(moduleId)
  const nextVersion = Math.max(currentVersion + 1, maxVersion + 1, 1)
  saveStandard(false, false, nextVersion)
}

function publishCurrentStandard(skipWarningCheck = false, skipImpactCheck = false) {
  const ref = {
    id: String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID),
    version: Math.max(1, toInt(draftModuleVersion.value || 1))
  }
  const hit = flowModules.getListeningChoiceByRef(ref)
  if (hit?.status === 'archived') {
    uni.showToast({ title: '归档版本不可发布', icon: 'none' })
    return
  }
  if (hit?.status === 'published') {
    uni.showToast({ title: '当前版本已发布', icon: 'none' })
    return
  }

  const moduleFallbackName = moduleNameFallbackById(ref.id)
  const moduleName = normalizeModuleName(draftModuleName.value, moduleFallbackName)
  const moduleNote = normalizeModuleNote(draftModuleNote.value)
  const publishPayload = {
    kind: 'listening_choice',
    id: ref.id,
    version: ref.version,
    name: moduleName,
    note: moduleNote,
    status: 'draft',
    ...listeningChoiceDraft.value
  }
  const validation = validateListeningChoiceStandardModule(publishPayload)
  if (validation.errors.length > 0) {
    uni.showModal({
      title: '题型流程校验失败',
      content: formatFlowModuleValidationIssues(validation.errors),
      showCancel: false
    })
    return
  }

  if (!skipWarningCheck && validation.warnings.length > 0) {
    uni.showModal({
      title: '题型流程校验提醒',
      content: `${formatFlowModuleValidationIssues(validation.warnings)}\n\n是否仍然发布？`,
      confirmText: '仍然发布',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        publishCurrentStandard(true, skipImpactCheck)
      }
    })
    return
  }

  if (!skipImpactCheck) {
    const impact = getFlowModuleSaveImpact(ref)
    const previousPublished = flowModules.getListeningChoiceLatestPublished(ref.id)
    const diffSummary = buildModuleDiffSummary({
      previousModule: previousPublished || null,
      nextModule: publishPayload as any,
      impactRules: impact.matchedRules as any
    })
    const contentLines = [
      `将发布版本：${moduleName}（${ref.id} @ v${ref.version}）`,
      `对比基线：${previousPublished ? formatModuleDisplayRef(previousPublished) : '无已发布基线'}`,
      `变更摘要：\n${formatModuleDiffSummary(diffSummary)}`,
      '发布后该版本可用于路由规则。是否继续？'
    ]
    if (moduleNote) contentLines.splice(1, 0, `流程备注：${moduleNote}`)
    const content = contentLines.join('\n')
    uni.showModal({
      title: '确认发布题型流程',
      content,
      confirmText: '确认发布',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        publishCurrentStandard(true, true)
      }
    })
    return
  }

  const publishImpact = getFlowModuleSaveImpact(ref)
  const previousPublished = flowModules.getListeningChoiceLatestPublished(ref.id)
  const publishDiffSummary = buildModuleDiffSummary({
    previousModule: previousPublished || null,
    nextModule: publishPayload as any,
    impactRules: publishImpact.matchedRules as any
  })

  flowModules.upsertListeningChoice(publishPayload)
  const ok = flowModules.setListeningChoiceStatus(ref, 'published')
  if (!ok) {
    uni.showToast({ title: '发布失败', icon: 'none' })
    return
  }
  const latest = flowModules.getListeningChoiceByRef(ref)
  syncDraftModuleMeta(latest || publishPayload)
  if (latest) listeningChoiceDraft.value = clone(toLegacyStandardModule(latest))
  appendFlowModulePublishLog({
    moduleId: ref.id,
    moduleVersion: ref.version,
    moduleDisplayRef: `${moduleName} @ v${ref.version}`,
    summaryLines: publishDiffSummary.summaryLines
  })
  uni.showToast({ title: `已发布 v${ref.version}`, icon: 'success' })
}

function archiveCurrentStandard() {
  const ref = {
    id: String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID),
    version: Math.max(1, toInt(draftModuleVersion.value || 1))
  }
  const hit = flowModules.getListeningChoiceByRef(ref)
  if (!hit) {
    uni.showToast({ title: '当前版本不存在', icon: 'none' })
    return
  }
  if (hit.status === 'archived') {
    uni.showToast({ title: '当前版本已归档', icon: 'none' })
    return
  }
  if (!flowModules.canTransitionListeningChoiceStatus(ref as any, 'archived')) {
    uni.showToast({ title: '当前状态不允许归档', icon: 'none' })
    return
  }

  const impact = getFlowModuleSaveImpact(ref)
  const moduleName = normalizeModuleName(hit?.name, moduleNameFallbackById(ref.id))
  const content = [
    `将归档：${moduleName}（${ref.id} @ v${ref.version}）`,
    `命中路由规则：${impact.matchedRuleCount} 条（启用 ${impact.enabledRuleCount} 条）`,
    `受影响路由规则：\n${formatFlowProfileImpactLines(impact.matchedRules as any)}`,
    '归档后新题不会命中该版本。是否继续？'
  ].join('\n')

  uni.showModal({
    title: '归档当前版本',
    content,
    confirmText: '确认归档',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      const ok = flowModules.archiveListeningChoice(ref)
      if (!ok) {
        uni.showToast({ title: '归档失败', icon: 'none' })
        return
      }
      const fallback = flowModules.getListeningChoiceLatestPublished(ref.id) || getDefaultModule()
      if (fallback) {
        draftModuleId.value = String(fallback.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
        draftModuleVersion.value = Number(fallback.version || 1)
        syncDraftModuleMeta(fallback)
        listeningChoiceDraft.value = clone(toLegacyStandardModule(fallback))
      }
      uni.showToast({ title: '已归档当前版本', icon: 'success' })
    }
  })
}

function migrateFlowProfilesToCurrentVersion() {
  const targetId = String(draftModuleId.value || LISTENING_CHOICE_STANDARD_FLOW_ID)
  const targetVersion = Math.max(1, toInt(draftModuleVersion.value || 1))
  const candidates = flowProfilesMigratableToCurrentVersion.value || []

  if (candidates.length <= 0) {
    uni.showToast({ title: '没有可迁移路由', icon: 'none' })
    return
  }

  const content = [
    `将把以下路由迁移到：${draftModuleDisplayRef.value}（${targetId}）`,
    `待迁移规则：${candidates.length} 条`,
    `当前版本分布：${formatFlowProfileVersionSummary(candidates)}`,
    `规则列表：\n${formatFlowProfileImpactLines(candidates as any, 10)}`,
    '是否继续？'
  ].join('\n')

  uni.showModal({
    title: '批量迁移路由版本',
    content,
    confirmText: '批量迁移',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      candidates.forEach((profile) => {
        patchFlowProfile(profile.id, {
          module: {
            id: targetId,
            version: targetVersion
          }
        })
      })
      uni.showToast({ title: `已迁移 ${candidates.length} 条路由`, icon: 'success' })
    }
  })
}

function resetStandard() {
  uni.showModal({
    title: '恢复默认题型流程',
    content: '将恢复系统默认流程，并影响所有标准题目。是否继续？',
    confirmText: '恢复',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return
      flowModules.resetListeningChoiceToDefault()
      const module = getDefaultModule()
      draftModuleId.value = String(module.id || LISTENING_CHOICE_STANDARD_FLOW_ID)
      draftModuleVersion.value = Number(module.version || 1)
      syncDraftModuleMeta(module)
      listeningChoiceDraft.value = clone(toLegacyStandardModule(module))
      uni.showToast({ title: '已恢复默认', icon: 'success' })
    }
  })
}

function toggleIntroBool(key: 'introShowTitle' | 'introShowTitleDescription' | 'introShowDescription' | 'introCountdownShowTitle') {
  listeningChoiceDraft.value = {
    ...listeningChoiceDraft.value,
    [key]: !(listeningChoiceDraft.value as any)?.[key]
  } as any
}

function patchIntroCountdown(patch: Record<string, any>) {
  listeningChoiceDraft.value = {
    ...listeningChoiceDraft.value,
    ...patch
  } as any
}

function enableIntroCountdown() {
  patchIntroCountdown({
    introCountdownEnabled: true,
    introCountdownSeconds: Math.max(1, introCountdownSeconds.value || 3),
    introCountdownLabel: introCountdownLabel.value || '准备'
  })
  currentStepIndex.value = 1
  configStepIndex.value = 1
}

function disableIntroCountdown() {
  patchIntroCountdown({
    introCountdownEnabled: false
  })
  if (configStepIndex.value <= 1) configStepIndex.value = 0
  if (currentStepIndex.value <= 1) currentStepIndex.value = 0
}

function getPerGroupRaw(index: number, key: string) {
  const step: any = listeningChoiceDraft.value?.perGroupSteps?.[index] || {}
  return step[key]
}

function getAudioSource(step: any): AudioSource {
  return step?.audioSource === 'description' ? 'description' : 'content'
}

function getPerGroupAudioSource(index: number): AudioSource {
  const step: any = listeningChoiceDraft.value?.perGroupSteps?.[index]
  return getAudioSource(step)
}

function getPerGroupBool(index: number, key: string, defaultValue: boolean) {
  const v = getPerGroupRaw(index, key)
  if (typeof v === 'boolean') return v
  return defaultValue
}

function patchPerGroupStep(index: number, patch: Record<string, any>) {
  const list: any[] = [...(listeningChoiceDraft.value?.perGroupSteps || [])]
  if (!list[index]) return
  list[index] = { ...list[index], ...patch }
  listeningChoiceDraft.value = { ...listeningChoiceDraft.value, perGroupSteps: list } as any
}

function setPerGroupAudioSource(index: number, audioSource: AudioSource) {
  patchPerGroupStep(index, { audioSource })
}

function togglePerGroupBool(index: number, key: string, defaultValue: boolean) {
  const current = getPerGroupBool(index, key, defaultValue)
  patchPerGroupStep(index, { [key]: !current })
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

function insertPerGroupStep(index: number, kind: QuickAddPerGroupKind, position: 'before' | 'after' = 'after') {
  const list: ListeningChoiceStandardPerGroupStepDef[] = [...(listeningChoiceDraft.value?.perGroupSteps || [])] as any
  const at = position === 'before' ? index : index + 1
  const safeAt = Math.max(0, Math.min(at, list.length))
  list.splice(safeAt, 0, createPerGroupStep(kind))
  listeningChoiceDraft.value = { ...listeningChoiceDraft.value, perGroupSteps: list } as any

  const flowIndex = flowIndexByPerGroupIndex(safeAt)
  currentStepIndex.value = flowIndex
  configStepIndex.value = flowIndex
}

function quickAddPerGroupStep(kind: QuickAddPerGroupKind) {
  const list: ListeningChoiceStandardPerGroupStepDef[] = [...(listeningChoiceDraft.value?.perGroupSteps || [])] as any
  if (!list.length) {
    listeningChoiceDraft.value = {
      ...listeningChoiceDraft.value,
      perGroupSteps: [createPerGroupStep(kind)]
    } as any
    const flowIndex = flowIndexByPerGroupIndex(0)
    currentStepIndex.value = flowIndex
    configStepIndex.value = flowIndex
    return
  }

  const cfg = selectedConfig.value
  const anchor = cfg?.type === 'per_group' ? cfg.index : list.length - 1
  insertPerGroupStep(anchor, kind, 'after')
}

function removePerGroupStep(index: number) {
  const list: ListeningChoiceStandardPerGroupStepDef[] = [...(listeningChoiceDraft.value?.perGroupSteps || [])] as any
  if (!list[index]) return

  if (list.length <= 1) {
    uni.showToast({ title: '每题组流程至少保留一个步骤', icon: 'none' })
    return
  }

  const removing = list[index]
  if (removing.kind === 'answerChoice') {
    const answerCount = list.filter(s => s?.kind === 'answerChoice').length
    if (answerCount <= 1) {
      uni.showToast({ title: '至少保留一个答题步骤', icon: 'none' })
      return
    }
  }

  list.splice(index, 1)
  listeningChoiceDraft.value = { ...listeningChoiceDraft.value, perGroupSteps: list } as any

  const nextIndex = Math.min(index, list.length - 1)
  const flowIndex = flowIndexByPerGroupIndex(nextIndex)
  currentStepIndex.value = flowIndex
  configStepIndex.value = flowIndex
}

function reorderPerGroupStepByFlowIndex(fromFlowIndex: number, toFlowIndex: number) {
  const fromCfg = resolveConfigByFlowIndex(fromFlowIndex)
  const toCfg = resolveConfigByFlowIndex(toFlowIndex)
  if (fromCfg?.type !== 'per_group' || toCfg?.type !== 'per_group') {
    uni.showToast({ title: '仅支持拖动每题组步骤', icon: 'none' })
    return
  }
  if (fromCfg.index === toCfg.index) return

  const list: ListeningChoiceStandardPerGroupStepDef[] = [...(listeningChoiceDraft.value?.perGroupSteps || [])] as any
  if (!list[fromCfg.index] || !list[toCfg.index]) return

  const [moving] = list.splice(fromCfg.index, 1)
  const safeTarget = Math.max(0, Math.min(toCfg.index, list.length))
  list.splice(safeTarget, 0, moving)
  listeningChoiceDraft.value = { ...listeningChoiceDraft.value, perGroupSteps: list } as any

  const flowIndex = flowIndexByPerGroupIndex(safeTarget)
  currentStepIndex.value = flowIndex
  configStepIndex.value = flowIndex
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

function summarizeSteps(steps: any[]): string {
  if (!Array.isArray(steps) || steps.length === 0) return '无步骤'
  const kinds = steps.map(s => String(s?.kind || '')).filter(Boolean)
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

.panel__header {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: rgba(248, 250, 252, 0.86);
}

.panel__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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

}
</style>
