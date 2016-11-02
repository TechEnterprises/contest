import assert from 'assert';

export default function ({ samples, method, config, transformers = [] }) {
  return function (promiseToListenFor) {
    return new Promise((resolve, reject) => {
      const watcher = method({ fromBlock: 'latest' });
      let resolved = false;
      let i = 0;
      function safeResolve() {
        if (!resolved) {
          resolved = true;
          watcher.stopWatching();
          assert.equal(i, samples.length, `${samples.length - i} events did not fire!`);
          resolve();
        }
      }
      watcher.watch((error, result) => {
        if (!error && !resolved) {
          i++;
          // run the assert for each output
          const expectedOutput = samples[i - 1];
          Object.keys(expectedOutput).forEach((key) => {
            const eOutput = expectedOutput[key];
            // apply output transformer
            const output = transformers[key] ? transformers[key](result.args[key]) : result.args[key];
            if (config.debug) { console.log('assertEvent:', output, eOutput); }
            // apply input function
            if (typeof eOutput === 'function') {
              return assert.equal(true, eOutput(output), eOutput);
            }
            return assert.equal(output, eOutput);
          });
          // end when done
          if (i === samples.length) { safeResolve(); }
        }
      });
      // execute the function to listen for and add a timeout
      return promiseToListenFor().then(() => {
        return new Promise((done) => setTimeout(done, 600));
      }).then(safeResolve).catch(reject);
    });
  };
}