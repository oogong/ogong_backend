const { PCA } = require("ml-pca");
const { kmeans } = require("ml-kmeans");
const Corporate = require("../models/Corporate");

const getClusterResult = async (stockList, sliderValue) => {
  const ids = [];
  const features = [];
  stockList.forEach((stock) => {
    const { id, name, profitability, stability, activity, potential, ogoong_rate } = stock;
    features.push([profitability, stability, activity, potential, ogoong_rate]);
    ids.push([id, name]);
  });

  // match scale with min-max normalization
  const scaledFeatures = await matchScale(features);

  // analyze
  const pcaResult = await transfromDemension(scaledFeatures);

  console.log(sliderValue);
  // map demension and match id with pca result
  const pcaResultAndId = await matchIdWithPcaResult(pcaResult, ids, features, sliderValue);

  // kmeans clustering
  const kmeansResult = await kmeansClustering(pcaResult);

  // cluster to response
  const clusterResult = await getClusterResultResponse(
    pcaResultAndId,
    kmeansResult
  );
  console.log(clusterResult);

  return clusterResult;
};

function matchScale(features) {
  return features.map((feature) => {
    const mean = feature.reduce((acc, val) => acc + val, 0) / feature.length;
    const std = Math.sqrt(
      feature.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      feature.length
    );
    return feature.map((val) => (val - mean) / std);
  });
}

function transfromDemension(features) {
  const pca = new PCA(features);
  return pca.predict(features).to2DArray();
}

function matchIdWithPcaResult(pca, ids, features, sliderValue) {
  const result = getMinMaxScale(pca);
  return result.map((point, index) => [
    ids[index][0],
    ids[index][1],
    point[0],
    point[1],
    Math.round(features[index][0] / sliderValue[0]), // profitability
    Math.round(features[index][1] / sliderValue[1]), // stability
    Math.round(features[index][2] / sliderValue[2]), // activity
    Math.round(features[index][3] / sliderValue[3]), // potential
    Math.round(features[index][4] / sliderValue[4]), // ogoong_rate
  ]);
}

function kmeansClustering(result) {
  return kmeans(result, 5);
}

async function getClusterResultResponse(result, kmeans) {
  const clusterResult = Array.from({ length: 5 }, (_, id) => ({
    id,
    data: [],
  }));

  // 클러스터에 대한 id 매핑
  await Promise.all(kmeans.clusters.map(async (cluster, index) => {
    const corp = await Corporate.findOne({ code: result[index][0] })

    clusterResult[cluster].data.push({
      id: result[index][0],
      name: result[index][1],
      x: result[index][2],
      y: result[index][3],
      수익성: corp.profitability,   // profitability
      안정성: corp.stability,       // stability
      활동성: corp.efficiency,      // activity
      생산성: corp.growth,          // potential
      오공지수: corp.ogong_rate,    // ogoong_rate
    });
  }));
  return clusterResult;
}

// min-max normailzation
function getMinMaxScale(features) {
  const allValues = features.flat();
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  return features.map((feature) => {
    return feature.map((val) => ((val - min) / (max - min)) * 100);
  });
}

module.exports = {
  getClusterResult,
};
