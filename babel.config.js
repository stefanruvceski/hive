// Default Expo preset plus inline-import, so Drizzle's generated `.sql` migrations are bundled
// as strings (https://orm.drizzle.team/docs/connect-expo-sqlite).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
