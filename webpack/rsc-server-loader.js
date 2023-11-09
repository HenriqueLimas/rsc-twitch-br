// import path from 'node:path'
import parser from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'

export default function rscServerLoader(source) {
  const {clientReferencesMap} = this.getOptions()
  const resourcePath = this.resourcePath

  const ast = parser.parse(source, {
    sourceType: 'module',
    sourceFilename: resourcePath
  })

  const clientRefences = []
  let hasUseClient = false

  traverse.default(ast, {
    enter(nodePath) {
      const {node} = nodePath;

      if (t.isProgram(node)) {
        if (node.directives.some(isUseClientDirective)) {
          hasUseClient = true;
        } else {
          nodePath.skip()
        }
      }

      if (isUseClientDirective(node)) {
        nodePath.skip()
        return
      }

      const exportName = getExportName(node)
      if (exportName) {
        const id = `${path.relative(
          process.cwd(),
          resourcePath
        )}#${exportName}`

        clientRefences.push({
          id,
          exportName,
        })

        nodePath.replaceWith(createExportReference(id, exportName))
      } else {
        nodePath.remove();
      }
    }
  })

  if (!hasUseClient) {
    this.callback(null, source)
    return
  }

  if (clientRefences.length) {
    clientReferencesMap.set(resourcePath, clientRefences)
  }

  const {code} = generate.default(ast, {
    sourceType: 'module',
    sourceFileName: resourcePath
  })

  this.callback(null, code)
}

function isUseClientDirective(directive) {
  return t.isDirectiveLiteral(directive.value) && directive.value.value === 'use client'
}

function getExportName(node) {
  if (t.isExportDeclaration(node)) {
    // Function
    if (t.isFunctionDeclaration(node.declaration)) {
      return node.declaration.id.name
    }

    // Variable
    if (t.isVariableDeclaration(node.declaration)) {
      return node.declaration.declarations[0].id.name
    }
  }

  return
}

function createExportReference(id, exportName) {
  return t.exportNamedDeclaration(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(exportName),
        t.objectExpression([
          // $$typeof: Symbol.for('react.client.reference')
          t.objectProperty(
            t.identifier('$$typeof'),
            t.callExpression(
              t.memberExpression(
                t.identifier('Symbol'),
                t.identifier('for')
              ),
              [t.stringLiteral('react.client.reference')]
            )
          ),

          // $$id: id
          t.objectProperty(
            t.identifier('$$id'),
            t.stringLiteral(id)
          )
        ])
      )
    ])
  )
}
