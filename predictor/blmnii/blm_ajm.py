import numpy as np
import psycopg2
import sys
import time

from numpy import linalg as LA
from sklearn import svm
from sklearn.preprocessing import MinMaxScaler

sys.path.append('../../config')
from database_config import databaseConfig as dcfg
from predictor_config import blmniiConfig

sys.path.append('../../utility')
import util

class BLMNII:
    def __init__(self,params):

        self._alpha = params['alpha']
        self._gamma0 = params['gamma']
        self._name = params['name']
        self._proba = params['proba']
        self._connDB = psycopg2.connect(database=dcfg['name'],user=dcfg['user'],password=dcfg['passwd'],
                                        host=dcfg['host'],port=dcfg['port'])
        self._cur = self._connDB.cursor()

        self._comSimMat = None
        self._proSimMat = None
        self._comNetSim = None
        self._proNetSim = None
        self._connMat = None
        self._develMode = False
        self._trainList = None
        self._testList = None

        self._nPair = params['maxTrainingDataSize']

    def predict(self,query):
        nQuery = len(query)
        # sys.stderr.write ("Processing Query.... \n")
        if self._develMode:
            queryIdx = [[i[0],i[1]] for i in query]

            comTrain = self._trainList[0]
            comTest = self._testList[0]

            proTrain = self._trainList[1]
            proTest = self._testList[1]

        else:
            # TO DO: Find better method to generate dataset
            pairIdList = util.randData(query,self._nPair)

            comList = [i[0] for i in pairIdList]
            comMeta, self._comSimMat = self._makeKernel(comList,"com")
            comTest =  list(set([comMeta[pair[0]] for ii,pair
                            in enumerate(query) if i<nQuery]))
            comTrain = [comMeta[i] for i in set(comList) if i not in comTest]

            proList = [i[1] for i in pairIdList]
            proMeta, self._proSimMat = self._makeKernel(proList,"pro")
            proTest =  list(set([proMeta[pair[1]] for ii,pair
                            in enumerate(query) if i<nQuery]))
            proTrain = [proMeta[i] for i in set(proList) if i not in proTest]

            queryIdx = ([[comMeta[pair[0]],proMeta[pair[1]]] for ii,pair
                        in enumerate(query) if ii<nQuery])

            self._connMat = self._makeAdjMat(comMeta,proMeta)

            self._comNetSim = self._makeNetSim("com")
            self._proNetSim = self._makeNetSim("pro")

        mergePred = []
        for i in queryIdx:
            comPred = self._predict(self._connMat,self._comSimMat,self._proSimMat,
                                    self._proNetSim,[proTest,proTrain],(i[0],i[1]),0)
            proPred = self._predict(self._connMat,self._proSimMat,self._comSimMat,
                                    self._comNetSim,[comTest,comTrain],(i[1],i[0]),1)
            mergePred.append(max(comPred[0],proPred[0]))
        return mergePred

    def close(self):
        self._connDB.close()

    def _predict(self,adjMatrix,sourceSim,targetSim,netSim,dataSplit,dataQuery,mode):
        if mode == 1:
            adjMatrix = [[row[i] for row in adjMatrix] for i in range(len(adjMatrix[0]))]

        testIndex = dataSplit[0]
        trainIndex = dataSplit[1]
        sourceIndex = dataQuery[0]
        targetIndex = dataQuery[1]

        nTrain = len(trainIndex)
        nTest = len(testIndex)
        nSource = len(sourceSim)
        nTarget = len(targetSim)

        intProfile = np.zeros(nTrain,dtype=float)
        neighbors = [j for i,j in enumerate(adjMatrix[sourceIndex]) if i in trainIndex]

        if len(set(neighbors)) == 1: #New Data use NII
            for i in range(nSource):
                for jj,j in enumerate(trainIndex):
                    intProfile[jj] += sourceSim [sourceIndex][i] * adjMatrix[i][j]

            scale = MinMaxScaler((0,1))
            intProfile = intProfile.reshape(-1,1)
            intProfile = scale.fit_transform(intProfile)
            intProfile = [i[0] for i in intProfile.tolist()]
            threshold = 0.5
            intProfile = [int(i>=threshold) for i in intProfile]

        else:
            for ii,i in enumerate(trainIndex):
                intProfile[ii] = adjMatrix[sourceIndex][i]

        if len(set(intProfile))==1:
            if self._proba:
                prediction = [[0.0,0.0]]
            else:
                prediction = [0.0]
        else:
            if len(set([adjMatrix[i][targetIndex] for i in range(nSource)])) == 1:
                gramTest = targetSim[targetIndex]
            else:
                gramTest = netSim[targetIndex]
            gramTrain = netSim
            for i in reversed(sorted(testIndex)):
                gramTest = np.delete(gramTest,i, 0)
                gramTrain = np.delete(gramTrain,i, 0)
                gramTrain = np.delete(gramTrain,i, 1)
            model = svm.SVC(kernel='precomputed', probability=True)
            model.fit(gramTrain, intProfile)

            if self._proba:
                prediction = model.predict_proba(gramTest.reshape(1,-1))
            else:
                prediction = model.predict(gramTest.reshape(1,-1))

        if self._proba:
            return (prediction[0][1],sourceIndex,targetIndex)
        else:
            return (float(prediction[0]),sourceIndex,targetIndex)

    def modParameter(self,proSimMat=None,comSimMat=None,connMat=None,develMode=False,
                        trainList=None,testList=None,netSim=None):
        if comSimMat is not None:
            self._comSimMat = comSimMat
        if proSimMat is not None:
            self._proSimMat = proSimMat
        if connMat is not None:
            self._connMat = connMat
        if develMode:
            self._develMode = develMode
        if trainList is not None:
            self._trainList = trainList
        if testList is not None:
            self._testList = testList
        if (self._connMat is not None and self._comSimMat is not None) and (netSim is None):
            self._comNetSim = self._makeNetSim("com")
            self._proNetSim = self._makeNetSim("pro")
        else:
            self._comNetSim = netSim[0]
            self._proNetSim = netSim[1]

    def _makeNetSim(self,mode,targetSim=None,gamma0=None,alpha=None):
        # makeNetSim already combined 2 similarity Measurement
        if mode == "com":
            targetSim = self._comSimMat
            adjMatrix = [[row[i] for row in self._connMat] for i in range(len(self._connMat[0]))]
            gamma0 = self._gamma0
            alpha = self._alpha
        elif mode == "pro":
            targetSim = self._proSimMat
            adjMatrix = self._connMat
            gamma0 = self._gamma0
            alpha = self._alpha
        nTarget = len(targetSim)
        netSim = np.zeros((targetSim.shape),dtype=float)
        for i in range(nTarget):
            intpro1 = np.array([adjMatrix[k][i] for k in range(len(adjMatrix))])
            gamma = sum(intpro1**2)*gamma0/nTarget
            for j in range(nTarget):
                intpro2 = np.array([adjMatrix[k][j] for k in range(len(adjMatrix))])
                netSim[j][i] = self._computeNetSim(intpro1,intpro2,gamma)
                netSim[j][i] = (alpha*targetSim[j][i] + (1-alpha)*netSim[j][i])
        return netSim

    def _computeNetSim(self,profile1,profile2,gamma):
        norm = LA.norm(profile1-profile2)
        value = -((norm**2)*gamma)
        return float(value)

    def _makeKernel(self,dataList,mode):
        dataList = list(set(dataList))
        dataDict = {e:i for i,e in enumerate(dataList)}#for Index
        simMat = np.zeros((len(dataList),len(dataList)), dtype=float)
        if mode=="com":
            qParam = ["com_id","com_similarity_simcomp","compound"]
        elif mode=="pro":
            qParam = ["pro_id","pro_similarity_smithwaterman","protein"]

        query = "SELECT " + qParam[0] +", " + qParam[1]+ " FROM " + qParam[2]
        queryC = " WHERE "

        for i,d in enumerate(dataList):
            if i>0:
                queryC += " OR "
            queryC += (qParam[0] + " = " + "'" + d + "'")
        query += queryC
        self._cur.execute(query)
        dataRows = self._cur.fetchall()
        for i,row in enumerate(dataRows):
            if row[1] != None:
                temp = row[1].split(',')
                temp = [i.split('=') for i in temp]
                for j in temp:
                    if j[0].split(':')[0] in dataDict:
                        simMat[dataDict[row[0]]][dataDict[j[0].split(':')[0]]]=float(j[1])
        return dataDict, simMat

    def _makeAdjMat(self,comList,proList):
        adjMat = np.zeros((len(comList), len(proList)), dtype=int)

        query = "SELECT com_id, pro_id, weight FROM compound_vs_protein"
        queryC = " WHERE ("
        for i,j in enumerate(comList):
            if i>0:
                queryC += " OR "
            queryC += " com_id = " + "'"+j+"'"
        queryC += ")"
        queryP = " AND ("
        for i,j in enumerate(proList):
            if i>0:
                queryP += " OR "
            queryP += " pro_id = " + "'"+j+"'"
        queryP += ")"

        query += queryC + queryP
        self._cur.execute(query)
        rows = self._cur.fetchall()
        for row in rows:
            adjMat[comList[row[0]]][proList[row[1]]]=(row[2])
        return adjMat

def test():
    pairQuery = [('COM00000020','PRO00001846')]
    predictorTest = BLMNII(blmniiConfig)
    testRes = predictorTest.predict(pairQuery)

def fullTesting(numData):
    # generate Pair List of Query
    testPairList = util.randData([],10000)
# Take True value from DB
    # Make cursor
    testData = []
    predRes = []
    predictor = BLMNII(blmniiConfig)
    for pair in testPairList:
        # testData.append(use doesExist() on posgresqlUtil function)
    # Predict all Pair
        predRes.append(predictor(pair))

    print "\nCalculate Performance"
    key = 'Navie implementation BLM-NII'
    precision, recall, _ = precision_recall_curve(testData, predRes)
    prAUC = average_precision_score(testData, predRes, average='micro')

    print "Visualiation"
    lineType = 'k-.'

    perf = {'precision': precision, 'recall': recall, 'prAUC': prAUC,
                 'lineType': lineType}
    perf2 = {'prAUC': prAUC, 'nTest': numData}

    with open(outPath+'perf_blmnii_ijah_perf.json', 'w') as fp:
        json.dump(perf2, fp, indent=2, sort_keys=True)

    plt.clf()
    plt.figure()
    plt.plot(perf['recall'], perf['precision'], perf['lineType'], label= key+' (area = %0.2f)' % perf['prAUC'], lw=2)
    plt.ylim([-0.05, 1.05])
    plt.xlim([-0.05, 1.05])
    plt.xlabel('Recall')
    plt.ylabel('Precision')
    plt.title('Precision-Recall Curve')
    plt.legend(loc="lower left")
    plt.savefig(outPath+'/ijah_pr_curve_'+str(time.time())+'.png', bbox_inches='tight')


if __name__=='__main__':
    startTime = time.time()
    # if sys.argv[1] == 'full':
    #     fullTesting(sys.argv[2])
    # else:
    test()
    print "Program is running for "+str(time.time()-startTime)+" seconds"
