bootstrap:
	rm -fr bootstrap
	mkdir bootstrap
	nodemeta grammars/bs-js-compiler.ometa --no-exports > bootstrap/bs-js-compiler.js
	nodemeta grammars/bs-ometa-compiler.ometa  --no-exports > bootstrap/bs-ometa-compiler.js
	nodemeta grammars/bs-ometa-optimizer.ometa  --no-exports > bootstrap/bs-ometa-optimizer.js
	nodemeta grammars/bs-ometa-js-compiler.ometa  --no-exports > bootstrap/bs-ometa-js-compiler.js
	rm -fr generated
	mkdir generated
	cat src/lib.js src/ometa-base.js src/parser.js bootstrap/bs-js-compiler.js bootstrap/bs-ometa-compiler.js bootstrap/bs-ometa-optimizer.js bootstrap/bs-ometa-js-compiler.js src/export-translator.js > generated/node-ometa-translator.js
	cat src/lib.js src/ometa-base.js src/parser.js src/export-runtime.js > generated/node-ometa-runtime.js
	rm -fr bootstrap
