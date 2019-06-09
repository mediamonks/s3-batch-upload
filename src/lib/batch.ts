export type Options<T> = {
  concurrency: number;
  files: Array<string>;
  processItem: (file: string) => Promise<T>;
  onProgress: () => void;
};

export default function streamBatch<T>({
  concurrency,
  files,
  processItem,
  onProgress,
}: Options<T>): Promise<T[]> {
  return new Promise(resolve => {
    let count = 0;
    const total = files.length;
    const results: T[] = [];

    // when upload for one item is done, complete or process the next
    const onItemDone = (result: T) => {
      results.push(result);
      count += 1;

      // if completed
      if (!files.length && count === total) {
        // temp fix for https://github.com/visionmedia/node-progress/pull/183
        setTimeout(() => {
          onProgress();
          resolve(results);
        }, 50);
      } else {
        onProgress();

        if (files.length) {
          processItem(files.shift()).then(onItemDone);
        }
      }
    };
    // start 'threads'
    for (let i = 0; i < Math.min(concurrency, files.length); i += 1) {
      processItem(files.shift()).then(onItemDone);
    }
  });
}
