'use client';

import { useState, useRef, useEffect } from 'react';

interface WordData {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  mnemonic: string;
  isLearned: boolean;
  association?: string; // 新增联想字段
  association2?: string; // 新增联想2字段
  association3?: string; // 新增联想3字段
}

type ViewState = 'word' | 'details' | 'status';

export default function Home() {
  const [wordsData, setWordsData] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewState, setViewState] = useState<ViewState>('word');
  const [studiedCount, setStudiedCount] = useState(0); // 记录学习过的单词数量（包括学会和没学会）
  const [audioEnabled, setAudioEnabled] = useState(true); // 音频播放总开关
  const [backupInterval, setBackupInterval] = useState(50); // 备份间隔（每学习多少个单词备份一次）
  const [reverseMode, setReverseMode] = useState(false); // 反转模式：先显示释义再显示单词
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 播放音频函数
  const playAudio = (word: string) => {
    // 检查音频开关
    if (!audioEnabled) return;

    // 检查 output2 文件夹中是否有对应的音频文件
    const audioPath = `/output2/${word}.mp3`;

    // 停止当前播放的音频
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // 创建新的音频对象
    const audio = new Audio(audioPath);
    audioRef.current = audio;

    // 播放音频，如果文件不存在会静默失败
    audio.play().catch(() => {
      // 音频文件不存在或播放失败，静默处理
    });
  };


  const parseFileContent = (content: string): WordData[] => {
    const lines = content.trim().split('\n');
    return lines.map(line => {
      const parts = line.split('|');
      return {
        word: parts[0] || '',
        phonetic: parts[1] || '',
        partOfSpeech: parts[2] || '',
        meaning: parts[3] || '',
        mnemonic: parts[4] || '',
        isLearned: parts[5] === '1',
        association: parts[6] || '', // 解析第6个字段作为联想
        association2: parts[7] || '', // 解析第7个字段作为联想2
        association3: parts[8] || '', // 解析第8个字段作为联想3

      };
    });
  };

  // 判断单词是否应该在循环中显示（收藏和熟记的核心业务逻辑）
  const shouldShowInLoop = (word: WordData): boolean => {
    // 未学会的单词总是要显示
    if (!word.isLearned) {
      return true;
    }
    // 其他情况不显示
    return false;
  };


  // 获取字段标签
  const getFieldLabel = (field: keyof WordData): string => {
    const labels = {
      word: '单词',
      phonetic: '音标',
      partOfSpeech: '词性',
      meaning: '含义',
      mnemonic: '助记',
      association: '联想',
      association2: '联想2',
      association3: '联想3'
    };
    return labels[field as keyof typeof labels] || field;
  };

  // 生成下载文件内容
  const generateFileContent = (): string => {
    return wordsData.map(word => {
      // 清理字段中的换行符和回车符，避免导出时格式错乱
      const cleanField = (field: string) => field.replace(/[\r\n]/g, ' ').trim();
      return [
        cleanField(word.word || ''),
        cleanField(word.phonetic || ''),
        cleanField(word.partOfSpeech || ''),
        cleanField(word.meaning || ''),
        cleanField(word.mnemonic || ''),
        word.isLearned ? '1' : '0',
        cleanField(word.association || ''), // 添加联想字段
        cleanField(word.association2 || ''), // 添加联想字段
        cleanField(word.association3 || '') // 添加联想字段

      ].join('|');
    }).join('\n');
  };

  // 生成文件名
  const generateFileName = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const dateTime = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    const currentWordIndex = currentIndex + 1;

    return `words_${currentWordIndex}_${dateTime}.txt`;
  };

  // 下载文件
  const handleDownload = () => {
    if (wordsData.length === 0) {
      alert('没有数据可以下载');
      return;
    }

    const content = generateFileContent();
    const fileName = generateFileName();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // 跳转功能
  const handleJump = () => {
    if (wordsData.length === 0) {
      alert('请先上传单词文件');
      return;
    }

    const input = prompt(`请输入要跳转的单词索引 (1-${wordsData.length}):`);

    if (input === null) {
      // 用户取消了输入
      return;
    }

    const targetIndex = parseInt(input.trim());

    if (isNaN(targetIndex)) {
      alert('请输入有效的数字');
      return;
    }

    if (targetIndex < 1 || targetIndex > wordsData.length) {
      alert(`索引必须在 1 到 ${wordsData.length} 之间`);
      return;
    }

    // 跳转到指定索引（转换为0基础索引）
    const newIndex = targetIndex - 1;
    setCurrentIndex(newIndex);
    setViewState('word');

    // 反转模式下先显示释义，不播音频；正常模式下显示单词，播放音频
    if (!reverseMode && wordsData[newIndex]) {
      setTimeout(() => {
        playAudio(wordsData[newIndex].word);
      }, 100);
    }
  };


  // 寻找下一个应该显示的单词索引
  const findNextDisplayableIndex = (startIndex: number): number => {
    for (let i = 1; i <= wordsData.length; i++) {
      const nextIndex = (startIndex + i) % wordsData.length;
      if (shouldShowInLoop(wordsData[nextIndex])) {
        return nextIndex;
      }
    }
    return startIndex; // 如果没有符合条件的单词，返回当前索引
  };

  // 寻找上一个应该显示的单词索引
  const findPrevDisplayableIndex = (startIndex: number): number => {
    for (let i = 1; i <= wordsData.length; i++) {
      const prevIndex = (startIndex - i + wordsData.length) % wordsData.length;
      if (shouldShowInLoop(wordsData[prevIndex])) {
        return prevIndex;
      }
    }
    return startIndex; // 如果没有符合条件的单词，返回当前索引
  };


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // 删除文件中的所有制表符
        const contentWithoutTabs = content.replace(/\t/g, '');
        const parsed = parseFileContent(contentWithoutTabs);
        setWordsData(parsed);
        // 找到第一个应该显示的单词
        const firstDisplayableIndex = parsed.findIndex(word => shouldShowInLoop(word));
        const targetIndex = firstDisplayableIndex >= 0 ? firstDisplayableIndex : 0;
        setCurrentIndex(targetIndex);
        setViewState('word');

        // 反转模式下先显示释义，不播音频；正常模式下显示单词，播放音频
        if (!reverseMode && parsed[targetIndex]) {
          setTimeout(() => {
            playAudio(parsed[targetIndex].word);
          }, 100);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleRightArrow = () => {
    if (viewState === 'word') {
      setViewState('details');
      // 反转模式下 details 才是显示单词的阶段，此时播放音频
      if (reverseMode && wordsData[currentIndex]) {
        setTimeout(() => playAudio(wordsData[currentIndex].word), 100);
      }
    } else if (viewState === 'details') {
      setViewState('status');
    } else if (viewState === 'status') {
      // 学习了一个单词，增加计数
      setStudiedCount(prev => {
        const newCount = prev + 1;
        // 根据设置的间隔自动下载
        if (newCount % backupInterval === 0) {
          setTimeout(() => {
            handleDownload();
          }, 100);
        }
        return newCount;
      });

      // 切换到下一个应该显示的单词
      const nextIndex = findNextDisplayableIndex(currentIndex);
      setCurrentIndex(nextIndex);
      setViewState('word');

      // 正常模式：进入 word（显示单词）时播放；反转模式：进入 word（显示释义）时不播
      if (!reverseMode && wordsData[nextIndex]) {
        setTimeout(() => {
          playAudio(wordsData[nextIndex].word);
        }, 100);
      }
    }
  };

  const handleLeftArrow = () => {
    if (viewState === 'status') {
      setViewState('details');
    } else if (viewState === 'details') {
      setViewState('word');

      // 正常模式返回 word（显示单词）时播放；反转模式返回 word（显示释义）时不播
      if (!reverseMode && wordsData[currentIndex]) {
        setTimeout(() => {
          playAudio(wordsData[currentIndex].word);
        }, 100);
      }
    } else if (viewState === 'word') {
      // 切换到上一个应该显示的单词的状态三
      const prevIndex = findPrevDisplayableIndex(currentIndex);
      setCurrentIndex(prevIndex);
      setViewState('status');
    }
  };

  const toggleLearnedStatus = () => {
    if (viewState === 'status' && wordsData.length > 0) {
      setWordsData(prevWordsData => {
        const updatedWords = [...prevWordsData];
        updatedWords[currentIndex] = {
          ...updatedWords[currentIndex],
          isLearned: !updatedWords[currentIndex].isLearned
        };
        return updatedWords;
      });
    }
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        handleRightArrow();
      } else if (event.key === 'ArrowLeft') {
        handleLeftArrow();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        // 在status状态下，上下键切换学习状态
        toggleLearnedStatus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [viewState, currentIndex, wordsData]);

  const currentWord = wordsData[currentIndex];
  const displayableCount = wordsData.filter(word => shouldShowInLoop(word)).length;

  const renderTable = () => {
    if (!currentWord) return null;

    // 反转模式下交换 word 和 details 的渲染
    const effectiveViewState = reverseMode && (viewState === 'word' || viewState === 'details')
      ? (viewState === 'word' ? 'details' : 'word')
      : viewState;

    if (effectiveViewState === 'word') {
      // 状态一：只显示单词
      return (
        <table className="w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl border-2 border-gray-300 bg-white rounded">
          <tbody>
            <tr>
              <td className="w-full px-6 sm:px-20 py-10 text-center border border-gray-300 text-6xl sm:text-9xl font-bold break-words">
                {currentWord.word}
              </td>
            </tr>
          </tbody>
        </table>
      );
    } else if (effectiveViewState === 'details') {
      // 状态二：显示详细信息（可编辑的前四行）
      return (
        <table className="w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl border-2 border-gray-300 bg-white rounded">
          <tbody>
            <tr>
              <td
                className="px-4 sm:px-6 py-4 text-center border border-gray-300 text-xl sm:text-3xl cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {currentWord.phonetic || '暂无音标'}
              </td>
            </tr>
            <tr>
              <td
                className="px-4 sm:px-6 py-4 text-center border border-gray-300 text-xl sm:text-3xl cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {currentWord.partOfSpeech || '暂无词性'}
              </td>
            </tr>
            <tr>
              <td
                className="px-4 sm:px-6 py-4 text-center border border-gray-300 text-3xl sm:text-6xl font-semibold cursor-pointer hover:bg-gray-100 transition-colors break-words"
              >
                {currentWord.meaning || '暂无含义'}
              </td>
            </tr>
            <tr>
              <td
                className="px-4 sm:px-6 py-4 text-center border border-gray-300 cursor-pointer text-xl sm:text-3xl hover:bg-gray-100 transition-colors break-words"
              >
                {currentWord.mnemonic || '暂无助记'}
              </td>
            </tr>
            <tr>
              <td
                className="px-6 py-4 text-center border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {currentWord.association ? (
                  <div className="mt-2 text-xl">
                    {currentWord.association.split('.').map((line, index) => {
                      if (index === 0) {
                        return <div key={index}>{line}.</div>;
                      }
                      return <div key={index}>{line}</div>;
                    })}
                  </div>
                ) : (
                  <span className="text-gray-400">暂无联想</span>
                )}
              </td>
            </tr>
            <tr>
              <td
                className="px-6 py-4 text-center border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {currentWord.association2 ? (
                  <div className="mt-2 text-xl">
                    {currentWord.association2.split('.').map((line, index) => {
                      if (index === 0) {
                        return <div key={index}>{line}.</div>;
                      }
                      return <div key={index}>{line}</div>;
                    })}
                  </div>
                ) : (
                  <span className="text-gray-400">暂无联想2</span>
                )}
              </td>
            </tr>
            <tr>
              <td
                className="px-6 py-4 text-center border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {currentWord.association3 ? (
                  <div className="mt-2 text-xl">
                    {currentWord.association3.split('.').map((line, index) => {
                      if (index === 0) {
                        return <div key={index}>{line}.</div>;
                      }
                      return <div key={index}>{line}</div>;
                    })}
                  </div>
                ) : (
                  <span className="text-gray-400">暂无联想3</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      );
    } else {
      // 状态三：显示是否记住状态
      return (
        <table className="w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl border-2 border-gray-300 bg-white rounded">
          <tbody>
            <tr>
              <td className={`w-full px-6 sm:px-20 py-10 text-center border border-gray-300 text-4xl sm:text-6xl font-bold ${currentWord.isLearned ? 'text-green-600' : 'text-red-600'
                }`}>
                {currentWord.isLearned ? '1' : '0'}
              </td>
            </tr>
          </tbody>
        </table>
      );
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt"
        className="hidden"
      />

      {/* 左侧按钮 */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4">
        <button
          onClick={handleLeftArrow}
          className="bg-gray-500 hover:bg-gray-600 text-white p-4 rounded-full shadow-lg transition-colors text-2xl opacity-30"
          title="向前 (左键)"
        >
          ←
        </button>
        <button
          onClick={handleRightArrow}
          className="bg-gray-500 hover:bg-gray-600 text-white p-4 rounded-full shadow-lg transition-colors text-2xl opacity-30"
          title="向后 (右键)"
        >
          →
        </button>
        <button
          onClick={toggleLearnedStatus}
          className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-lg transition-colors text-xl opacity-30"
          title="切换学会状态 (上下键)"
        >
          ↕
        </button>
      </div>

      {/* 右侧按钮 */}
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4">
        <button
          onClick={handleLeftArrow}
          className="bg-gray-500 hover:bg-gray-600 text-white p-4 rounded-full shadow-lg transition-colors text-2xl opacity-30"
          title="向前 (左键)"
        >
          ←
        </button>
        <button
          onClick={handleRightArrow}
          className="bg-gray-500 hover:bg-gray-600 text-white p-4 rounded-full shadow-lg transition-colors text-2xl opacity-30"
          title="向后 (右键)"
        >
          →
        </button>
        <button
          onClick={toggleLearnedStatus}
          className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-lg transition-colors text-xl opacity-30"
          title="切换学会状态 (上下键)"
        >
          ↕
        </button>
      </div>

      {/* 顶部区域 - 进度和按钮 */}
      <div className="flex justify-between items-center pt-2 px-4">
        {/* 左侧按钮组 */}
        <div className="flex gap-2">
          {/* 音频开关 */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-2 py-1 rounded text-xl shadow transition-colors ${audioEnabled
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-400 hover:bg-gray-500 text-white'
              }`}
            title="音频播放开关"
          >
            🔊{audioEnabled ? 'ON' : 'OFF'}
          </button>

          {/* 反转模式开关 */}
          <button
            onClick={() => setReverseMode(!reverseMode)}
            className={`px-2 py-1 rounded text-xl shadow transition-colors ${reverseMode
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-gray-400 hover:bg-gray-500 text-white'
              }`}
            title="反转模式：先显示释义再显示单词"
          >
            🔄{reverseMode ? 'ON' : 'OFF'}
          </button>

          {/* 备份间隔设置 */}
          <button
            onClick={() => {
              const input = prompt(`请输入备份间隔（每学习多少个单词自动备份）:`, String(backupInterval));
              if (input !== null) {
                const num = parseInt(input.trim());
                if (!isNaN(num) && num > 0) {
                  setBackupInterval(num);
                } else {
                  alert('请输入有效的正整数');
                }
              }
            }}
            className="bg-teal-500 hover:bg-teal-600 text-white px-2 py-1 rounded text-xl shadow transition-colors"
            title="设置备份间隔"
          >
            💾{backupInterval}
          </button>
        </div>

        {/* 中间进度区域 */}
        <div className="text-center text-3xl font-bold text-gray-700">
          {wordsData.length > 0 ? (
            <>
              {`${currentIndex + 1}/${wordsData.length} 错(${wordsData.slice(0, currentIndex + 1).filter(w => !w.isLearned).length}/${wordsData.filter(w => !w.isLearned).length})`}
            </>
          ) : '0/0'}
        </div>

        {/* 右侧按钮组 */}
        <div className="flex gap-2">
          {wordsData.length > 0 && currentWord && (
            <>
            </>
          )}
        </div>
      </div>

      {/* 表格区域 */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-0">
        {wordsData.length > 0 ? (
          displayableCount > 0 ? (
            renderTable()
          ) : (
            <div className="text-green-500 text-lg">🎉 所有单词都已完成学习！</div>
          )
        ) : (
          <div className="text-gray-500 text-lg">请上传单词文件</div>
        )}
      </div>

      {/* 右下角按钮组 */}
      <div className="fixed bottom-4 right-4 flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm shadow transition-colors"
        >
          上传
        </button>
        <button
          onClick={handleDownload}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm shadow transition-colors"
        >
          下载
        </button>
        <button
          onClick={handleJump}
          className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm shadow transition-colors"
        >
          跳转
        </button>
      </div>
    </div>
  );
}
