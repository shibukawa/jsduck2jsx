module.exports = function(grunt) {
  'use strict';
  var pkg = grunt.file.readJSON('package.json');

  grunt.initConfig({
    srcDir: "src",
    sampleDir: "sample",
    buildDir: "bin",
    libDir: "lib",
    testDir: "test",
    docDir: "doc",
    outputDir: "output",

    watch: {
      build: {
        files: ['<%= srcDir %>/*.jsx', '<%= libDir %>/*.jsx'],
        tasks: ['jsx:build']
      },
      test: {
        src: ['<%= libDir %>/*.jsx', '<%= srcDir %>/*.jsx', '<%= testDir %>/*.jsx'],
        files: ['<%= testDir %>/*.jsx'],
        tasks: ['jsx:test']
      }
    },

    jsx: {
      build: {
        src: ['<%= srcDir %>/*.jsx'],
        dest: '<%= buildDir %>',
        add_search_path: ['<%= libDir %>'],
        executable: 'node'
      },

      test: {
        src: ['<%= testDir %>/*.jsx'],
        add_search_path: ['<%= libDir %>', '<%= srcDir %>', '<%= outputDir %>'],
        test: true
      },

      doc: {
        src: ['<%= libDir %>/*.jsx', '<%= srcDir %>/*.jsx'],
        add_search_path: ['<%= libDir %>', '<%= srcDir %>'],
        dest: '<%= docDir %>',
        mode: 'doc'
      }
    }
  });

  for (var key in pkg.devDependencies) {
    if (/grunt-/.test(key)) {
      grunt.loadNpmTasks(key);
    }
  }

  grunt.registerTask('default', ['jsx:build']);
  grunt.registerTask('build', ['jsx:build']);
  grunt.registerTask('test', ['jsx:test']);
  grunt.registerTask('doc', ['jsx:doc']);
};
// vim: set expandtab tabstop=2 shiftwidth=2:
